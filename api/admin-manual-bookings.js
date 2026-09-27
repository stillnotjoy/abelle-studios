// api/admin-manual-bookings.js

import { requireAdmin } from "../server/adminAuth.js";
import { recordPaymentTransaction } from "../server/paymentLedger.js";
import {
  buildCustomerDirectory,
  normalizeCustomerPhone,
  summarizeCustomers,
} from "../server/customerDirectory.js";

export const config = {
  maxDuration: 60,
};

const APPS_SCRIPT_REQUEST_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
};

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_BOOKING_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const ALLOWED_PAYMENT_METHODS = [
  "CASH",
  "GCASH",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
];

function sendJson(res, status, data) {
  return res.status(status).json(data);
}

function cleanText(value) {
  return String(value || "").trim();
}

function roundCurrency(value) {
  return (
    Math.round(Number(value || 0) * 100) /
    100
  );
}

function getShootCode(packageTitle) {
  const title = cleanText(packageTitle)
    .toLowerCase();

  if (title.includes("barkada")) {
    return "B";
  }

  if (
    title.includes("duo") ||
    title.includes("couple")
  ) {
    return "D";
  }

  if (title.includes("family")) {
    return "F";
  }

  if (title.includes("event")) {
    return "E";
  }

  if (
    title.includes("solo") ||
    title.includes("portrait")
  ) {
    return "S";
  }

  return "X";
}

function getBookingReference(
  date,
  packageTitle
) {
  const cleanDate = cleanText(date)
    .replaceAll("-", "")
    .slice(2);

  const shootCode =
    getShootCode(packageTitle);

  const uniqueNumber =
    Math.floor(
      1000 + Math.random() * 9000
    );

  return `AB-M-${shootCode}-${cleanDate}-${uniqueNumber}`;
}

function getNextDate(date) {
  const parsedDate = new Date(
    `${cleanText(date)}T00:00:00.000Z`
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  parsedDate.setUTCDate(
    parsedDate.getUTCDate() + 1
  );

  return parsedDate
    .toISOString()
    .slice(0, 10);
}

function getScheduledAt(date, time) {
  const scheduledAt = new Date(
    `${cleanText(date)}T${cleanText(
      time
    )}:00+08:00`
  );

  return Number.isNaN(
    scheduledAt.getTime()
  )
    ? null
    : scheduledAt;
}

async function findCalendarEventByReference({
  appsScriptUrl,
  appsScriptSecret,
  bookingReference,
  shootDate,
}) {
  const rangeEnd = getNextDate(shootDate);

  if (!rangeEnd) {
    return null;
  }

  const snapshotUrl = new URL(
    appsScriptUrl
  );

  snapshotUrl.searchParams.set(
    "secret",
    appsScriptSecret
  );
  snapshotUrl.searchParams.set(
    "action",
    "calendar_sync_snapshot"
  );
  snapshotUrl.searchParams.set(
    "start",
    shootDate
  );
  snapshotUrl.searchParams.set(
    "end",
    rangeEnd
  );

  const snapshotResponse = await fetch(
    snapshotUrl.toString(),
    {
      method: "GET",
      cache: "no-store",
      headers: APPS_SCRIPT_REQUEST_HEADERS,
    }
  );

  const snapshotText =
    await snapshotResponse.text();

  let snapshotData;

  try {
    snapshotData = snapshotText
      ? JSON.parse(snapshotText)
      : null;
  } catch {
    console.error(
      "Apps Script recovery returned non-JSON:",
      snapshotText.slice(0, 500)
    );

    return null;
  }

  if (
    !snapshotResponse.ok ||
    !snapshotData?.ok ||
    !Array.isArray(snapshotData.events)
  ) {
    return null;
  }

  const expectedReference = cleanText(
    bookingReference
  ).toUpperCase();

  const matchingEvent =
    snapshotData.events.find(
      (event) =>
        cleanText(
          event?.bookingReference
        ).toUpperCase() ===
        expectedReference
    );

  const eventId = cleanText(
    matchingEvent?.eventId
  );

  return eventId
    ? {
        eventId,
        bookingReference:
          expectedReference,
        recovered: true,
      }
    : null;
}

async function supabaseRequest(
  path,
  options = {}
) {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,

      headers: {
        apikey:
          SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

        "Content-Type":
          "application/json",

        Prefer:
          "return=representation",

        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error(
      "Supabase API error:",
      data
    );

    throw new Error(
      typeof data === "object" &&
        data?.message
        ? data.message
        : "Supabase request failed."
    );
  }

  return data;
}

async function getPackageById(packageId) {
  const encodedPackageId =
    encodeURIComponent(packageId);

  const packages = await supabaseRequest(
    [
      "abelle_packages",
      "?select=",
      [
        "id",
        "name",
        "default_price",
        "default_deposit",
        "duration_minutes",
        "is_active",
      ].join(","),
      `&id=eq.${encodedPackageId}`,
      "&limit=1",
    ].join("")
  );

  return Array.isArray(packages)
    ? packages[0] || null
    : null;
}

async function getManualBookingById(
  bookingId
) {
  const encodedBookingId =
    encodeURIComponent(bookingId);

  const bookings =
    await supabaseRequest(
      [
        "manual_bookings",
        "?select=",
        [
          "id",
          "booking_reference",
          "client_name",
          "email",
          "phone",
          "package_title",
          "package_price",
          "shoot_date",
          "shoot_time",
          "booking_status",
          "payment_status",
          "amount_paid",
          "remaining_balance",
          "payment_provider",
          "payment_reference",
          "payment_option",
          "calendar_event_id",
          "client_drive_folder_id",
          "client_drive_folder_url",
          "client_drive_folder_name",
          "drive_folder_created_at",
          "shoot_status",
          "shoot_completed_at",
          "post_production_status",
          "editing_due_date",
          "ready_to_upload_at",
          "delivered_at",
          "notes",
        ].join(","),
        `&id=eq.${encodedBookingId}`,
        "&limit=1",
      ].join("")
    );

  return Array.isArray(bookings)
    ? bookings[0] || null
    : null;
}

async function createManualBookingInCalendar(
  manualBooking
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (
    !appsScriptUrl ||
    !appsScriptSecret
  ) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const appsScriptPayload = {
    secret: appsScriptSecret,
    action: "create_manual_booking",

    bookingReference:
      manualBooking.booking_reference,

    name:
      manualBooking.client_name,

    email:
      manualBooking.email,

    phone:
      manualBooking.phone,

    packageId:
      manualBooking.package_id,

    packageTitle:
      manualBooking.package_title,

    packagePrice:
      manualBooking.package_price,

    durationMinutes:
      manualBooking.duration_minutes,

    date:
      manualBooking.shoot_date,

    time:
      manualBooking.shoot_time,

    paymentStatus:
      manualBooking.payment_status,

    amountPaid:
      manualBooking.amount_paid,

    remainingBalance:
      manualBooking.remaining_balance,

    notes:
      manualBooking.notes || "",

    paymentMethod:
      manualBooking.payment_provider ||
      "UNKNOWN",

    paymentReference:
      manualBooking.payment_reference ||
      "",
  };

  const appsScriptResponse = await fetch(
    appsScriptUrl,
    {
      method: "POST",

      headers: {
        ...APPS_SCRIPT_REQUEST_HEADERS,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        appsScriptPayload
      ),
    }
  );

  const text =
    await appsScriptResponse.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    console.error(
      "Apps Script non-JSON response:",
      text.slice(0, 500)
    );

    const recoveredEvent =
      await findCalendarEventByReference({
        appsScriptUrl,
        appsScriptSecret,
        bookingReference:
          manualBooking.booking_reference,
        shootDate:
          manualBooking.shoot_date,
      });

    if (recoveredEvent) {
      console.warn(
        "Recovered completed Apps Script booking:",
        manualBooking.booking_reference
      );

      return recoveredEvent;
    }

    throw new Error(
      "Google Calendar completed without a readable confirmation. Please refresh before trying again."
    );
  }

  if (
    !appsScriptResponse.ok ||
    !data?.ok
  ) {
    console.error(
      "Apps Script manual booking error:",
      data
    );

    throw new Error(
      data?.error ||
        "Could not create calendar event."
    );
  }

  return data;
}

async function recordManualBookingPaymentExternally(
  paymentUpdate
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (
    !appsScriptUrl ||
    !appsScriptSecret
  ) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const response = await fetch(
    appsScriptUrl,
    {
      method: "POST",

      headers: {
        ...APPS_SCRIPT_REQUEST_HEADERS,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        secret: appsScriptSecret,
        action:
          "record_manual_booking_payment",

        bookingReference:
          paymentUpdate.bookingReference,

        paymentStatus:
          paymentUpdate.paymentStatus,

        amountPaid:
          paymentUpdate.amountPaid,

        remainingBalance:
          paymentUpdate.remainingBalance,

        amountReceived:
          paymentUpdate.amountReceived,

        paymentMethod:
          paymentUpdate.paymentMethod,

        paymentReference:
          paymentUpdate.paymentReference,

        paymentDate:
          paymentUpdate.paymentDate,

        paymentNotes:
          paymentUpdate.paymentNotes,
      }),
    }
  );

  const responseText =
    await response.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    console.error(
      "Apps Script payment update returned non-JSON:",
      responseText
    );

    throw new Error(
      "Could not read the Google Sheet payment update response."
    );
  }

  if (
    !response.ok ||
    !data?.ok
  ) {
    console.error(
      "Apps Script payment update failed:",
      data
    );

    throw new Error(
      data?.error ||
        "Could not update the linked Google Sheet payment record."
    );
  }

  return data;
}

async function updateManualBookingExternally(
  manualBooking
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (
    !appsScriptUrl ||
    !appsScriptSecret
  ) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const response = await fetch(
    appsScriptUrl,
    {
      method: "POST",
      headers: {
        ...APPS_SCRIPT_REQUEST_HEADERS,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        secret: appsScriptSecret,
        action:
          "update_manual_booking",
        bookingReference:
          manualBooking.booking_reference,
        calendarEventId:
          manualBooking.calendar_event_id ||
          "",
        name:
          manualBooking.client_name,
        email: manualBooking.email,
        phone: manualBooking.phone,
        packageTitle:
          manualBooking.package_title,
        packagePrice:
          manualBooking.package_price,
        durationMinutes:
          manualBooking.duration_minutes,
        date:
          manualBooking.shoot_date,
        time:
          manualBooking.shoot_time,
        paymentStatus:
          manualBooking.payment_status,
        amountPaid:
          manualBooking.amount_paid,
        remainingBalance:
          manualBooking.remaining_balance,
        paymentMethod:
          manualBooking.payment_provider ||
          "UNKNOWN",
        paymentReference:
          manualBooking.payment_reference ||
          "",
        notes:
          manualBooking.notes || "",
      }),
    }
  );

  const responseText =
    await response.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    throw new Error(
      "Could not read the booking update response from Google Calendar and Sheets."
    );
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error ||
        "Could not update Google Calendar and Sheets."
    );
  }

  return data;
}

function isUpcomingManualBooking(
  booking
) {
  const scheduledAt = new Date(
    `${cleanText(
      booking?.shoot_date
    )}T${cleanText(
      booking?.shoot_time
    )}:00+08:00`
  );

  return (
    booking?.shoot_status !==
      "COMPLETED" &&
    !Number.isNaN(
      scheduledAt.getTime()
    ) &&
    scheduledAt.getTime() > Date.now()
  );
}

async function createClientDriveFolderExternally(
  manualBooking
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (
    !appsScriptUrl ||
    !appsScriptSecret
  ) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const response = await fetch(
    appsScriptUrl,
    {
      method: "POST",

      headers: {
        ...APPS_SCRIPT_REQUEST_HEADERS,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        secret: appsScriptSecret,

        action:
          "create_client_drive_folder",

        bookingReference:
          manualBooking.booking_reference,

        packageTitle:
          manualBooking.package_title,

        clientName:
          manualBooking.client_name,
      }),
    }
  );

  const responseText =
    await response.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    console.error(
      "Apps Script Drive folder creation returned non-JSON:",
      responseText
    );

    throw new Error(
      "Could not read the Google Drive folder creation response."
    );
  }

  if (
    !response.ok ||
    !data?.ok
  ) {
    console.error(
      "Apps Script Drive folder creation failed:",
      data
    );

    throw new Error(
      data?.error ||
        "Could not create the client Google Drive folder."
    );
  }

  if (
    !cleanText(data.folderId) ||
    !cleanText(data.folderUrl)
  ) {
    console.error(
      "Apps Script Drive folder response is missing folder details:",
      data
    );

    throw new Error(
      "The client folder was created, but its Google Drive details were incomplete."
    );
  }

  return data;
}

async function deleteManualBookingRecords(
  manualBooking
) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (
    !appsScriptUrl ||
    !appsScriptSecret
  ) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const appsScriptResponse = await fetch(
    appsScriptUrl,
    {
      method: "POST",

      headers: {
        ...APPS_SCRIPT_REQUEST_HEADERS,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        secret: appsScriptSecret,

        action:
          "delete_manual_booking",

        bookingReference:
          manualBooking.booking_reference,

        calendarEventId:
          manualBooking.calendar_event_id ||
          "",
      }),
    }
  );

  const responseText =
    await appsScriptResponse.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    console.error(
      "Apps Script delete returned non-JSON:",
      responseText
    );

    throw new Error(
      "Could not read the Apps Script deletion response."
    );
  }

  if (
    !appsScriptResponse.ok ||
    !data?.ok
  ) {
    console.error(
      "Apps Script manual booking deletion failed:",
      data
    );

    throw new Error(
      data?.error ||
        "Could not delete the linked calendar and sheet records."
    );
  }

  return data;
}

async function getCustomerDirectoryBookings() {
  return supabaseRequest(
    [
      "manual_bookings",
      "?select=id,booking_reference,client_name,email,phone,package_title,package_price,shoot_date,shoot_time,booking_status,payment_status,amount_paid,remaining_balance,booking_source,post_production_status,created_at",
      "&order=shoot_date.desc",
      "&limit=5000",
    ].join("")
  );
}

function normalizeCommunicationMessage(message) {
  const direction = cleanText(
    message?.direction
  ).toLowerCase();

  return {
    id: cleanText(
      message?.id || message?.uid
    ),
    channel: "sms",
    direction:
      direction === "inbound" ||
      direction === "incoming" ||
      direction === "received" ||
      direction === "in"
        ? "inbound"
        : "outbound",
    body: cleanText(
      message?.body || message?.message
    ).slice(0, 4000),
    status: cleanText(
      message?.status
    ).slice(0, 80),
    sentAt: cleanText(
      message?.sentAt ||
        message?.createdAt ||
        message?.date
    ),
    from: cleanText(message?.from).slice(
      0,
      80
    ),
    to: cleanText(message?.to).slice(0, 80),
  };
}

async function getPhilSmsHistory(phone) {
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;
  const appsScriptSecret =
    process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (!appsScriptUrl || !appsScriptSecret) {
    throw new Error(
      "Missing Google Apps Script environment variables."
    );
  }

  const historyUrl = new URL(
    appsScriptUrl
  );

  historyUrl.searchParams.set(
    "secret",
    appsScriptSecret
  );
  historyUrl.searchParams.set(
    "action",
    "philsms_history"
  );
  historyUrl.searchParams.set(
    "phone",
    phone
  );

  const response = await fetch(
    historyUrl.toString(),
    {
      method: "GET",
      headers: APPS_SCRIPT_REQUEST_HEADERS,
    }
  );
  const responseText =
    await response.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    console.error(
      "Apps Script SMS history returned non-JSON:",
      responseText.slice(0, 500)
    );

    throw new Error(
      "Could not read the SMS history response."
    );
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error ||
        "Could not load PhilSMS history."
    );
  }

  const messages = Array.isArray(
    data.messages
  )
    ? data.messages
        .map(normalizeCommunicationMessage)
        .filter(
          (message) =>
            message.id ||
            message.body ||
            message.sentAt
        )
    : [];

  return {
    messages,
    hasMore: Boolean(data.hasMore),
  };
}

export default async function handler(
  req,
  res
) {
  try {
    if (!(await requireAdmin(req, res))) {
      return;
    }

    /*
     * Load all manual bookings.
     */
    if (req.method === "GET") {
      if (
        cleanText(req.query?.view).toLowerCase() ===
        "communications"
      ) {
        const customerId = cleanText(
          req.query?.customerId
        );

        if (!customerId) {
          return sendJson(res, 400, {
            error:
              "Customer profile is required.",
          });
        }

        const customerBookings =
          await getCustomerDirectoryBookings();
        const customers =
          buildCustomerDirectory(
            customerBookings || []
          );
        const customer = customers.find(
          (entry) =>
            entry.id === customerId
        );

        if (!customer) {
          return sendJson(res, 404, {
            error:
              "Customer profile could not be found. Refresh Customers and try again.",
          });
        }

        const normalizedPhone =
          normalizeCustomerPhone(
            customer.phone
          );

        if (!normalizedPhone) {
          return sendJson(res, 400, {
            error:
              "This customer does not have a mobile number.",
          });
        }

        const history =
          await getPhilSmsHistory(
            normalizedPhone
          );

        return sendJson(res, 200, {
          channel: "sms",
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          messages: history.messages,
          hasMore: history.hasMore,
          fetchedAt:
            new Date().toISOString(),
        });
      }

      if (
        cleanText(req.query?.view).toLowerCase() ===
        "customers"
      ) {
        const customerBookings =
          await getCustomerDirectoryBookings();

        const customers =
          buildCustomerDirectory(
            customerBookings || []
          );

        return sendJson(res, 200, {
          summary:
            summarizeCustomers(customers),
          customers,
        });
      }

      const bookings =
        await supabaseRequest(
          [
            "manual_bookings",
            "?select=*",
            "&order=created_at.desc",
          ].join("")
        );

      return sendJson(res, 200, {
        bookings: bookings || [],
      });
    }

    /*
     * Create a new manual booking
     * OR create a client Drive folder.
     */
    if (req.method === "POST") {
      const body = req.body || {};

      if (
        cleanText(body.action) ===
        "update_customer"
      ) {
        const customerId = cleanText(
          body.customerId
        );
        const customerName = cleanText(
          body.name
        ).slice(0, 120);
        const customerEmail = cleanText(
          body.email
        )
          .toLowerCase()
          .slice(0, 254);
        const customerPhone = cleanText(
          body.phone
        ).slice(0, 40);
        const normalizedPhone =
          normalizeCustomerPhone(
            customerPhone
          );

        if (!customerId || !customerName) {
          return sendJson(res, 400, {
            error:
              "Customer name is required.",
          });
        }

        if (!customerEmail && !normalizedPhone) {
          return sendJson(res, 400, {
            error:
              "Keep at least one email address or mobile number for this customer.",
          });
        }

        if (
          customerEmail &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            customerEmail
          )
        ) {
          return sendJson(res, 400, {
            error:
              "Enter a valid customer email address.",
          });
        }

        if (
          normalizedPhone &&
          (normalizedPhone.length < 10 ||
            normalizedPhone.length > 15)
        ) {
          return sendJson(res, 400, {
            error:
              "Enter a valid customer mobile number.",
          });
        }

        const customerBookings =
          await supabaseRequest(
            [
              "manual_bookings",
              "?select=id,booking_reference,client_name,email,phone,package_title,package_price,shoot_date,shoot_time,booking_status,payment_status,amount_paid,remaining_balance,booking_source,post_production_status,created_at",
              "&order=shoot_date.desc",
              "&limit=5000",
            ].join("")
          );
        const customers =
          buildCustomerDirectory(
            customerBookings || []
          );
        const customer = customers.find(
          (entry) => entry.id === customerId
        );

        if (!customer) {
          return sendJson(res, 404, {
            error:
              "Customer profile could not be found. Refresh Customers and try again.",
          });
        }

        const duplicateCustomer =
          customers.find((entry) => {
            if (entry.id === customerId) {
              return false;
            }

            const samePhone =
              normalizedPhone &&
              normalizeCustomerPhone(
                entry.phone
              ) === normalizedPhone;
            const sameEmail =
              customerEmail &&
              cleanText(entry.email)
                .toLowerCase() ===
                customerEmail;

            return samePhone || sameEmail;
          });

        if (duplicateCustomer) {
          return sendJson(res, 409, {
            error:
              "That mobile number or email address already belongs to another customer profile.",
          });
        }

        const bookingIds =
          customer.bookings
            .map((booking) =>
              cleanText(booking.id)
            )
            .filter(Boolean);

        if (!bookingIds.length) {
          return sendJson(res, 404, {
            error:
              "No booking records are connected to this customer.",
          });
        }

        const updatedBookings =
          await supabaseRequest(
            `manual_bookings?id=in.(${bookingIds.join(",")})`,
            {
              method: "PATCH",
              body: JSON.stringify({
                client_name: customerName,
                email: customerEmail,
                phone: customerPhone,
              }),
            }
          );

        if (!updatedBookings?.length) {
          return sendJson(res, 500, {
            error:
              "Customer information could not be updated.",
          });
        }

        const updatedBookingIds =
          new Set(bookingIds);
        const nextBookings =
          (customerBookings || []).map(
            (booking) =>
              updatedBookingIds.has(
                cleanText(booking.id)
              )
                ? {
                    ...booking,
                    client_name:
                      customerName,
                    email: customerEmail,
                    phone: customerPhone,
                  }
                : booking
          );
        const nextCustomers =
          buildCustomerDirectory(nextBookings);
        const updatedCustomer =
          nextCustomers.find((entry) =>
            entry.bookings.some(
              (booking) =>
                updatedBookingIds.has(
                  cleanText(booking.id)
                )
            )
          );

        return sendJson(res, 200, {
          success: true,
          customer: updatedCustomer,
          updatedBookingCount:
            updatedBookings.length,
          message:
            "Customer information updated.",
        });
      }

      /*
       * MARK SHOOT COMPLETE
       *
       * Marks the actual photography
       * session as completed and moves
       * it into the editing queue.
       */
      if (
        cleanText(body.action) ===
        "mark_shoot_complete"
      ) {
        const bookingId =
          cleanText(body.id);

        if (!bookingId) {
          return sendJson(res, 400, {
            error:
              "Manual booking ID is required.",
          });
        }

        const manualBooking =
          await getManualBookingById(
            bookingId
          );

        if (!manualBooking) {
          return sendJson(res, 404, {
            error:
              "Manual booking not found.",
          });
        }

        /*
         * Safe against accidental
         * double-clicks.
         */
        if (
          manualBooking.shoot_status ===
          "COMPLETED"
        ) {
          return sendJson(res, 200, {
            success: true,
            reused: true,
            booking: manualBooking,
            message:
              "This shoot is already marked as completed.",
          });
        }

        const encodedBookingId =
          encodeURIComponent(
            bookingId
          );

        const completedAt =
          new Date().toISOString();

        const updated =
          await supabaseRequest(
            `manual_bookings?id=eq.${encodedBookingId}`,
            {
              method: "PATCH",

              body: JSON.stringify({
                shoot_status:
                  "COMPLETED",

                shoot_completed_at:
                  completedAt,

                post_production_status:
                  "FOR_EDITING",
              }),
            }
          );

        if (!updated?.length) {
          return sendJson(res, 404, {
            error:
              "The booking could not be updated.",
          });
        }

        return sendJson(res, 200, {
          success: true,
          reused: false,
          booking: updated[0],

          message:
            "Shoot marked complete and moved to For Editing.",
        });
      }

      /*
       * POST-PRODUCTION WORKFLOW
       *
       * Keeps the editing queue in a strict,
       * predictable order:
       *
       * FOR_EDITING -> READY_FOR_DELIVERY
       * -> DELIVERED
       *
       * A ready booking may also be returned
       * to editing when more work is needed.
       */
      if (
        cleanText(body.action) ===
        "update_post_production"
      ) {
        const bookingId =
          cleanText(body.id);

        const nextStatus =
          cleanText(body.status)
            .toUpperCase();

        const editingDueDate =
          cleanText(
            body.editing_due_date
          );

        const allowedStatuses = [
          "FOR_EDITING",
          "READY_FOR_DELIVERY",
          "DELIVERED",
        ];

        if (!bookingId) {
          return sendJson(res, 400, {
            error:
              "Manual booking ID is required.",
          });
        }

        if (
          !allowedStatuses.includes(
            nextStatus
          )
        ) {
          return sendJson(res, 400, {
            error:
              "A valid post-production status is required.",
          });
        }

        if (editingDueDate) {
          const dateMatch =
            editingDueDate.match(
              /^(\d{4})-(\d{2})-(\d{2})$/
            );

          const parsedDate = dateMatch
            ? new Date(
                `${editingDueDate}T00:00:00Z`
              )
            : null;

          if (
            !dateMatch ||
            Number.isNaN(
              parsedDate.getTime()
            ) ||
            parsedDate
              .toISOString()
              .slice(0, 10) !==
              editingDueDate
          ) {
            return sendJson(res, 400, {
              error:
                "Editing due date must be a valid date.",
            });
          }
        }

        const manualBooking =
          await getManualBookingById(
            bookingId
          );

        if (!manualBooking) {
          return sendJson(res, 404, {
            error:
              "Manual booking not found.",
          });
        }

        if (
          manualBooking.shoot_status !==
          "COMPLETED"
        ) {
          return sendJson(res, 409, {
            error:
              "Mark the shoot complete before starting post-production.",
          });
        }

        const currentStatus =
          cleanText(
            manualBooking.post_production_status
          ).toUpperCase() ||
          "FOR_EDITING";

        const allowedTransitions = {
          FOR_EDITING: [
            "FOR_EDITING",
            "READY_FOR_DELIVERY",
          ],
          READY_FOR_DELIVERY: [
            "FOR_EDITING",
            "READY_FOR_DELIVERY",
            "DELIVERED",
          ],
          DELIVERED: ["DELIVERED"],
        };

        if (
          !(
            allowedTransitions[
              currentStatus
            ] || []
          ).includes(nextStatus)
        ) {
          return sendJson(res, 409, {
            error:
              "This booking cannot skip its current post-production step.",
          });
        }

        if (
          nextStatus ===
            "READY_FOR_DELIVERY" &&
          !cleanText(
            manualBooking.client_drive_folder_url
          )
        ) {
          return sendJson(res, 409, {
            error:
              "Create or connect the client Drive folder before marking files ready.",
          });
        }

        const now =
          new Date().toISOString();

        const updatePayload = {
          post_production_status:
            nextStatus,
          editing_due_date:
            editingDueDate || null,
        };

        if (
          nextStatus ===
          "READY_FOR_DELIVERY"
        ) {
          updatePayload.ready_to_upload_at =
            currentStatus ===
            "READY_FOR_DELIVERY"
              ? manualBooking.ready_to_upload_at ||
                now
              : now;

          updatePayload.delivered_at =
            null;
        }

        if (
          nextStatus === "DELIVERED"
        ) {
          updatePayload.delivered_at =
            manualBooking.delivered_at ||
            now;
        }

        if (
          nextStatus ===
            "FOR_EDITING" &&
          currentStatus ===
            "READY_FOR_DELIVERY"
        ) {
          updatePayload.ready_to_upload_at =
            null;
          updatePayload.delivered_at =
            null;
        }

        const encodedBookingId =
          encodeURIComponent(
            bookingId
          );

        const updated =
          await supabaseRequest(
            `manual_bookings?id=eq.${encodedBookingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(
                updatePayload
              ),
            }
          );

        if (!updated?.length) {
          return sendJson(res, 404, {
            error:
              "The post-production update could not be saved.",
          });
        }

        const statusMessages = {
          FOR_EDITING:
            currentStatus ===
            "READY_FOR_DELIVERY"
              ? "Booking returned to the editing queue."
              : "Editing deadline saved.",
          READY_FOR_DELIVERY:
            "Files marked ready for delivery.",
          DELIVERED:
            "Client delivery marked complete.",
        };

        return sendJson(res, 200, {
          success: true,
          booking: updated[0],
          message:
            statusMessages[nextStatus],
        });
      }
      /*
       * CREATE CLIENT GOOGLE DRIVE FOLDER
       *
       * This happens when the CRM sends:
       *
       * {
       *   action: "create_client_drive_folder",
       *   id: "BOOKING_ID"
       * }
       */
      if (
        cleanText(body.action) ===
        "create_client_drive_folder"
      ) {
        const bookingId =
          cleanText(body.id);

        if (!bookingId) {
          return sendJson(res, 400, {
            error:
              "Manual booking ID is required.",
          });
        }

        const manualBooking =
          await getManualBookingById(
            bookingId
          );

        if (!manualBooking) {
          return sendJson(res, 404, {
            error:
              "Manual booking not found.",
          });
        }

        /*
         * If Supabase already has a folder
         * saved for this booking, simply
         * return it instead of creating
         * another folder.
         */
        if (
          cleanText(
            manualBooking.client_drive_folder_id
          ) &&
          cleanText(
            manualBooking.client_drive_folder_url
          )
        ) {
          return sendJson(res, 200, {
            success: true,

            reused: true,

            booking:
              manualBooking,

            driveFolder: {
              folderId:
                manualBooking.client_drive_folder_id,

              folderUrl:
                manualBooking.client_drive_folder_url,

              folderName:
                manualBooking.client_drive_folder_name ||
                "",

              folderCreated:
                false,
            },

            message:
              "This booking already has a client Google Drive folder.",
          });
        }

        /*
         * Ask Apps Script to create the
         * folder in the Abelle Client Photos
         * master Drive folder.
         */
        const driveResult =
          await createClientDriveFolderExternally(
            manualBooking
          );

        const encodedBookingId =
          encodeURIComponent(
            bookingId
          );

        const driveFolderCreatedAt =
          new Date().toISOString();

        /*
         * Save the returned Google Drive
         * information permanently against
         * this booking in Supabase.
         */
        const updated =
          await supabaseRequest(
            `manual_bookings?id=eq.${encodedBookingId}`,
            {
              method: "PATCH",

              body: JSON.stringify({
                client_drive_folder_id:
                  cleanText(
                    driveResult.folderId
                  ),

                client_drive_folder_url:
                  cleanText(
                    driveResult.folderUrl
                  ),

                client_drive_folder_name:
                  cleanText(
                    driveResult.folderName
                  ),

                drive_folder_created_at:
                  driveFolderCreatedAt,
              }),
            }
          );

        if (!updated?.length) {
          return sendJson(res, 500, {
            error:
              "The Google Drive folder was created, but its details could not be saved to the booking.",
          });
        }

        return sendJson(res, 200, {
          success: true,

          reused:
            !Boolean(
              driveResult.folderCreated
            ),

          booking:
            updated[0],

          driveFolder: {
            folderId:
              cleanText(
                driveResult.folderId
              ),

            folderUrl:
              cleanText(
                driveResult.folderUrl
              ),

            folderName:
              cleanText(
                driveResult.folderName
              ),

            folderCreated:
              Boolean(
                driveResult.folderCreated
              ),
          },

          message:
            driveResult.folderCreated
              ? "Client Google Drive folder created and saved successfully."
              : "Existing client Google Drive folder found and saved successfully.",
        });
      }

      /*
       * NORMAL MANUAL BOOKING CREATION
       */
      const clientName =
        cleanText(body.clientName);

      const isHistoricalBooking =
        body.isHistoricalBooking === true;

      const historicalWorkflowStatus =
        cleanText(
          body.historicalWorkflowStatus ||
            "DELIVERED"
        ).toUpperCase();

      const email =
        cleanText(body.email);

      const phone =
        cleanText(body.phone);

      const packageId =
        cleanText(body.packageId);

      const shootDate =
        cleanText(body.shootDate);

      const shootTime =
        cleanText(body.shootTime);

      const notes =
        cleanText(body.notes);

      const requestedAdditionalItems =
        Array.isArray(
          body.additionalItems
        )
          ? body.additionalItems
          : [];

      const paymentStatus =
        cleanText(
          body.paymentStatus || "UNPAID"
        ).toUpperCase();

      const initialPaymentMethod =
        cleanText(
          body.paymentMethod || "CASH"
        ).toUpperCase();

      const initialPaymentReference =
        cleanText(body.paymentReference);

      const initialPaymentDate =
        cleanText(body.paymentDate) ||
        new Date().toISOString();

      if (
        !clientName ||
        !packageId ||
        !shootDate ||
        !shootTime
      ) {
        return sendJson(res, 400, {
          error:
            "Client name, package, date, and time are required.",
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          shootDate
        )
      ) {
        return sendJson(res, 400, {
          error:
            "The selected shoot date is invalid.",
        });
      }

      if (
        !ALLOWED_BOOKING_TIMES.includes(
          shootTime
        )
      ) {
        return sendJson(res, 400, {
          error:
            "Please select a valid studio time between 9:00 AM and 5:00 PM.",
        });
      }

      const allowedPaymentStatuses = [
        "UNPAID",
        "PARTIAL",
        "PAID",
      ];

      if (
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return sendJson(res, 400, {
          error:
            "Invalid payment status.",
        });
      }

      if (isHistoricalBooking) {
        const scheduledAt =
          getScheduledAt(
            shootDate,
            shootTime
          );

        if (
          !scheduledAt ||
          scheduledAt.getTime() >=
            Date.now()
        ) {
          return sendJson(res, 400, {
            error:
              "Historical booking mode can only be used for a shoot time that has already passed.",
          });
        }

        if (
          ![
            "FOR_EDITING",
            "DELIVERED",
          ].includes(
            historicalWorkflowStatus
          )
        ) {
          return sendJson(res, 400, {
            error:
              "Choose a valid historical workflow status.",
          });
        }
      }

      if (
        paymentStatus !== "UNPAID" &&
        !ALLOWED_PAYMENT_METHODS.includes(
          initialPaymentMethod
        )
      ) {
        return sendJson(res, 400, {
          error:
            "Please select a valid payment method.",
        });
      }

      if (
        paymentStatus !== "UNPAID" &&
        Number.isNaN(
          new Date(initialPaymentDate).getTime()
        )
      ) {
        return sendJson(res, 400, {
          error:
            "Please select a valid payment date.",
        });
      }

      const selectedPackage =
        await getPackageById(
          packageId
        );

      if (!selectedPackage) {
        return sendJson(res, 404, {
          error:
            "The selected package could not be found.",
        });
      }

      if (!selectedPackage.is_active) {
        return sendJson(res, 409, {
          error:
            "The selected package is currently disabled.",
        });
      }

      if (
        requestedAdditionalItems.length >
        10
      ) {
        return sendJson(res, 400, {
          error:
            "A booking can have up to 10 additional items.",
        });
      }

      const additionalItems = [];

      for (const requestedItem of
        requestedAdditionalItems) {
        const itemType = cleanText(
          requestedItem?.type
        ).toUpperCase();

        if (itemType === "PACKAGE") {
          const additionalPackageId =
            cleanText(
              requestedItem?.packageId
            );

          if (!additionalPackageId) {
            return sendJson(res, 400, {
              error:
                "Please choose every additional package.",
            });
          }

          const additionalPackage =
            await getPackageById(
              additionalPackageId
            );

          if (
            !additionalPackage ||
            !additionalPackage.is_active
          ) {
            return sendJson(res, 409, {
              error:
                "One of the additional packages is unavailable.",
            });
          }

          const additionalPackagePrice =
            roundCurrency(
              requestedItem?.price
            );

          if (
            !Number.isFinite(
              additionalPackagePrice
            ) ||
            additionalPackagePrice < 0 ||
            additionalPackagePrice > 1000000
          ) {
            return sendJson(res, 500, {
              error:
                "Enter a valid cost for every additional package.",
            });
          }

          additionalItems.push({
            type: "PACKAGE",
            name: additionalPackage.name,
            price:
              additionalPackagePrice,
            durationMinutes: Number(
              additionalPackage.duration_minutes ||
                40
            ),
          });

          continue;
        }

        if (itemType === "CUSTOM") {
          const itemName = cleanText(
            requestedItem?.name
          ).slice(0, 100);

          const itemPrice =
            roundCurrency(
              requestedItem?.price
            );

          if (
            !itemName ||
            !Number.isFinite(itemPrice) ||
            itemPrice <= 0 ||
            itemPrice > 1000000
          ) {
            return sendJson(res, 400, {
              error:
                "Enter a valid name and cost for every additional service.",
            });
          }

          additionalItems.push({
            type: "CUSTOM",
            name: itemName,
            price: itemPrice,
            durationMinutes: 0,
          });

          continue;
        }

        return sendJson(res, 400, {
          error:
            "An additional booking item is invalid.",
        });
      }

      const basePackagePrice =
        roundCurrency(
          selectedPackage.default_price
        );

      const additionalItemsTotal =
        roundCurrency(
          additionalItems.reduce(
            (total, item) =>
              total + item.price,
            0
          )
        );

      const packagePrice =
        roundCurrency(
          basePackagePrice +
            additionalItemsTotal
        );

      const durationMinutes =
        additionalItems.reduce(
          (total, item) =>
            total +
            item.durationMinutes,
          Number(
            selectedPackage.duration_minutes ||
              40
          )
        );

      if (
        !Number.isFinite(
          packagePrice
        ) ||
        packagePrice < 0
      ) {
        return sendJson(res, 500, {
          error:
            "The selected package has an invalid price.",
        });
      }

      let amountPaid =
        Number(
          body.amountPaid || 0
        );

      if (
        !Number.isFinite(
          amountPaid
        ) ||
        amountPaid < 0
      ) {
        return sendJson(res, 400, {
          error:
            "Amount paid must be 0 or higher.",
        });
      }

      if (
        paymentStatus === "UNPAID"
      ) {
        amountPaid = 0;
      }

      if (
        paymentStatus === "PAID"
      ) {
        amountPaid =
          packagePrice;
      }

      if (
        paymentStatus === "PARTIAL" &&
        (
          amountPaid <= 0 ||
          amountPaid >= packagePrice
        )
      ) {
        return sendJson(res, 400, {
          error:
            "For a partial payment, the amount paid must be greater than 0 and lower than the package price.",
        });
      }

      if (
        amountPaid >
        packagePrice
      ) {
        return sendJson(res, 400, {
          error:
            "Amount paid cannot be higher than the package price.",
        });
      }

      const remainingBalance =
        roundCurrency(
          Math.max(
            packagePrice -
              amountPaid,
            0
          )
        );

      const combinedPackageTitle = [
        selectedPackage.name,
        ...additionalItems.map(
          (item) => item.name
        ),
      ].join(" + ");

      const additionalItemsNote =
        additionalItems.length > 0
          ? `Additional items: ${additionalItems
              .map(
                (item) =>
                  `${item.name} — ₱${item.price.toLocaleString(
                    "en-PH"
                  )}`
              )
              .join("; ")}`
          : "";

      const bookingNotes = [
        additionalItemsNote,
        notes,
      ]
        .filter(Boolean)
        .join("\n\n");

     const bookingReference =
  getBookingReference(
    shootDate,
    selectedPackage.name
  );

      const manualBookingPayload = {
        booking_reference:
          bookingReference,

        client_name:
          clientName,

        email,

        phone,

        /*
         * Used when sending the booking
         * to Apps Script. These are removed
         * before the Supabase insert.
         */
        package_id:
          selectedPackage.id,

        duration_minutes:
          durationMinutes,

        package_title:
          combinedPackageTitle,

        package_price:
          packagePrice,

        shoot_date:
          shootDate,

        shoot_time:
          shootTime,

        payment_status:
          paymentStatus,

        amount_paid:
          amountPaid,

        remaining_balance:
          remainingBalance,

        payment_provider:
          amountPaid > 0
            ? initialPaymentMethod
            : null,

        payment_reference:
          amountPaid > 0
            ? initialPaymentReference || null
            : null,

        payment_option:
          amountPaid > 0
            ? "MANUAL_ADMIN"
            : "PAY_IN_STUDIO",

        booking_status:
          "CONFIRMED",

        shoot_status:
          isHistoricalBooking
            ? "COMPLETED"
            : "SCHEDULED",

        shoot_completed_at:
          isHistoricalBooking
            ? getScheduledAt(
                shootDate,
                shootTime
              ).toISOString()
            : null,

        post_production_status:
          isHistoricalBooking
            ? historicalWorkflowStatus
            : "NOT_STARTED",

        delivered_at:
          isHistoricalBooking &&
          historicalWorkflowStatus ===
            "DELIVERED"
            ? new Date().toISOString()
            : null,

        notes: bookingNotes,
      };

      const calendarResult =
        isHistoricalBooking
          ? {
              eventId: "",
              notificationsSkipped:
                true,
            }
          : await createManualBookingInCalendar(
              manualBookingPayload
            );

      const {
        package_id,
        duration_minutes,
        ...databaseBookingPayload
      } = manualBookingPayload;

      const databasePayload = {
        ...databaseBookingPayload,

        calendar_event_id:
          calendarResult.eventId ||
          null,

        calendar_status:
          isHistoricalBooking
            ? "NOT_REQUIRED"
            : "CREATED",
      };

      const created =
        await supabaseRequest(
          "manual_bookings",
          {
            method: "POST",

            body:
              JSON.stringify(
                databasePayload
              ),
          }
        );

      const createdBooking =
        created?.[0] || null;

      if (createdBooking && amountPaid > 0) {
        await recordPaymentTransaction({
          booking: createdBooking,
          amount: amountPaid,
          paymentDate: initialPaymentDate,
          paymentMethod:
            initialPaymentMethod,
          paymentProvider:
            initialPaymentMethod,
          paymentReference:
            initialPaymentReference,
          source: "INITIAL_MANUAL_PAYMENT",
          notes:
            isHistoricalBooking
              ? "Payment recorded with a historical booking."
              : "Initial payment recorded when the manual booking was created.",
          idempotencyKey:
            `initial-manual:${createdBooking.id}`,
        });
      }

      return sendJson(
        res,
        201,
        {
          booking:
            createdBooking,

          calendarEventId:
            calendarResult.eventId ||
            "",

          historical:
            isHistoricalBooking,

          notificationsSent:
            !isHistoricalBooking,
        }
      );
    }

    /*
     * Record an additional payment against
     * an existing manual booking.
     */
    if (
      req.method === "PATCH"
    ) {
      const body =
        req.body || {};

      if (
        cleanText(body.action) ===
        "update_booking"
      ) {
        const bookingId =
          cleanText(body.id);

        if (!bookingId) {
          return sendJson(res, 400, {
            error:
              "Manual booking ID is required.",
          });
        }

        const manualBooking =
          await getManualBookingById(
            bookingId
          );

        if (!manualBooking) {
          return sendJson(res, 404, {
            error:
              "Manual booking not found.",
          });
        }

        if (
          !isUpcomingManualBooking(
            manualBooking
          )
        ) {
          return sendJson(res, 409, {
            error:
              "Only bookings whose shoot time is still in the future can be edited.",
          });
        }

        const clientName =
          cleanText(body.clientName);

        const email =
          cleanText(body.email);

        const phone =
          cleanText(body.phone);

        const packageId =
          cleanText(body.packageId);

        const shootDate =
          cleanText(body.shootDate);

        const shootTime =
          cleanText(body.shootTime);

        const notes =
          cleanText(body.notes);

        const requestedAdditionalItems =
          Array.isArray(
            body.additionalItems
          )
            ? body.additionalItems
            : [];

        if (
          !clientName ||
          !packageId ||
          !shootDate ||
          !shootTime
        ) {
          return sendJson(res, 400, {
            error:
              "Client name, package, date, and time are required.",
          });
        }

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            shootDate
          )
        ) {
          return sendJson(res, 400, {
            error:
              "The selected shoot date is invalid.",
          });
        }

        if (
          !ALLOWED_BOOKING_TIMES.includes(
            shootTime
          )
        ) {
          return sendJson(res, 400, {
            error:
              "Please select a valid studio time between 9:00 AM and 5:00 PM.",
          });
        }

        const updatedSchedule = {
          shoot_date: shootDate,
          shoot_time: shootTime,
          shoot_status:
            manualBooking.shoot_status,
        };

        if (
          !isUpcomingManualBooking(
            updatedSchedule
          )
        ) {
          return sendJson(res, 400, {
            error:
              "The updated shoot date and time must still be in the future.",
          });
        }

        if (
          requestedAdditionalItems.length >
          10
        ) {
          return sendJson(res, 400, {
            error:
              "A booking can have up to 10 additional items.",
          });
        }

        const selectedPackage =
          await getPackageById(
            packageId
          );

        if (!selectedPackage) {
          return sendJson(res, 404, {
            error:
              "The selected package could not be found.",
          });
        }

        const additionalItems = [];

        for (const requestedItem of
          requestedAdditionalItems) {
          const itemType = cleanText(
            requestedItem?.type
          ).toUpperCase();

          if (itemType === "PACKAGE") {
            const additionalPackageId =
              cleanText(
                requestedItem?.packageId
              );

            const additionalPackage =
              additionalPackageId
                ? await getPackageById(
                    additionalPackageId
                  )
                : null;

            const itemPrice =
              roundCurrency(
                requestedItem?.price
              );

            if (
              !additionalPackage ||
              !Number.isFinite(
                itemPrice
              ) ||
              itemPrice < 0 ||
              itemPrice > 1000000
            ) {
              return sendJson(
                res,
                400,
                {
                  error:
                    "Choose a valid package and cost for every additional shoot.",
                }
              );
            }

            additionalItems.push({
              name:
                additionalPackage.name,
              price: itemPrice,
              durationMinutes: Number(
                additionalPackage.duration_minutes ||
                  40
              ),
            });

            continue;
          }

          if (itemType === "CUSTOM") {
            const itemName = cleanText(
              requestedItem?.name
            ).slice(0, 100);

            const itemPrice =
              roundCurrency(
                requestedItem?.price
              );

            if (
              !itemName ||
              !Number.isFinite(
                itemPrice
              ) ||
              itemPrice <= 0 ||
              itemPrice > 1000000
            ) {
              return sendJson(
                res,
                400,
                {
                  error:
                    "Enter a valid name and cost for every additional service.",
                }
              );
            }

            additionalItems.push({
              name: itemName,
              price: itemPrice,
              durationMinutes: 0,
            });

            continue;
          }

          return sendJson(res, 400, {
            error:
              "An additional booking item is invalid.",
          });
        }

        const basePackagePrice =
          roundCurrency(
            selectedPackage.default_price
          );

        const packagePrice =
          roundCurrency(
            basePackagePrice +
              additionalItems.reduce(
                (total, item) =>
                  total + item.price,
                0
              )
          );

        const durationMinutes =
          additionalItems.reduce(
            (total, item) =>
              total +
              item.durationMinutes,
            Number(
              selectedPackage.duration_minutes ||
                40
            )
          );

        const amountPaid =
          roundCurrency(
            manualBooking.amount_paid
          );

        if (packagePrice < amountPaid) {
          return sendJson(res, 400, {
            error:
              `The booking total cannot be lower than the ₱${amountPaid.toLocaleString(
                "en-PH"
              )} already paid. Record a refund separately first.`,
          });
        }

        const remainingBalance =
          roundCurrency(
            packagePrice - amountPaid
          );

        const paymentStatus =
          amountPaid <= 0
            ? "UNPAID"
            : remainingBalance <= 0
              ? "PAID"
              : "PARTIAL";

        const combinedPackageTitle = [
          selectedPackage.name,
          ...additionalItems.map(
            (item) => item.name
          ),
        ].join(" + ");

        const additionalItemsNote =
          additionalItems.length > 0
            ? `Additional items: ${additionalItems
                .map(
                  (item) =>
                    `${item.name} — ₱${item.price.toLocaleString(
                      "en-PH"
                    )}`
                )
                .join("; ")}`
            : "";

        const bookingNotes = [
          additionalItemsNote,
          notes,
        ]
          .filter(Boolean)
          .join("\n\n");

        const updatePayload = {
          client_name: clientName,
          email,
          phone,
          package_title:
            combinedPackageTitle,
          package_price: packagePrice,
          shoot_date: shootDate,
          shoot_time: shootTime,
          payment_status:
            paymentStatus,
          remaining_balance:
            remainingBalance,
          notes: bookingNotes,
        };

        const encodedBookingId =
          encodeURIComponent(
            bookingId
          );

        const updated =
          await supabaseRequest(
            `manual_bookings?id=eq.${encodedBookingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(
                updatePayload
              ),
            }
          );

        if (!updated?.length) {
          return sendJson(res, 404, {
            error:
              "The booking could not be updated.",
          });
        }

        try {
          await updateManualBookingExternally(
            {
              ...manualBooking,
              ...updatePayload,
              duration_minutes:
                durationMinutes,
            }
          );
        } catch (externalError) {
          try {
            await supabaseRequest(
              `manual_bookings?id=eq.${encodedBookingId}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  client_name:
                    manualBooking.client_name,
                  email:
                    manualBooking.email,
                  phone:
                    manualBooking.phone,
                  package_title:
                    manualBooking.package_title,
                  package_price:
                    manualBooking.package_price,
                  shoot_date:
                    manualBooking.shoot_date,
                  shoot_time:
                    manualBooking.shoot_time,
                  payment_status:
                    manualBooking.payment_status,
                  remaining_balance:
                    manualBooking.remaining_balance,
                  notes:
                    manualBooking.notes,
                }),
              }
            );
          } catch (rollbackError) {
            console.error(
              "Booking edit rollback failed:",
              rollbackError
            );
          }

          throw new Error(
            externalError.message ||
              "The booking was not updated because Google Calendar and Sheets could not be synchronized.",
            { cause: externalError }
          );
        }

        return sendJson(res, 200, {
          success: true,
          booking: updated[0],
          message:
            "Booking updated in the CRM, Google Calendar, and spreadsheet.",
        });
      }

      const bookingId =
        cleanText(
          body.id
        );

      const paymentMethod =
        cleanText(
          body.paymentMethod ||
            "CASH"
        ).toUpperCase();

      const paymentReference =
        cleanText(
          body.paymentReference
        );

      const paymentNotes =
        cleanText(
          body.paymentNotes
        );

      const paymentDate =
        cleanText(
          body.paymentDate
        ) ||
        new Date().toISOString();

      const amountReceived =
        roundCurrency(
          body.amountReceived
        );

      if (!bookingId) {
        return sendJson(
          res,
          400,
          {
            error:
              "Manual booking ID is required.",
          }
        );
      }

      if (
        !Number.isFinite(
          amountReceived
        ) ||
        amountReceived <= 0
      ) {
        return sendJson(
          res,
          400,
          {
            error:
              "Enter a payment amount greater than ₱0.",
          }
        );
      }

      if (
        !ALLOWED_PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return sendJson(
          res,
          400,
          {
            error:
              "Please select a valid payment method.",
          }
        );
      }

      const manualBooking =
        await getManualBookingById(
          bookingId
        );

      if (!manualBooking) {
        return sendJson(
          res,
          404,
          {
            error:
              "Manual booking not found.",
          }
        );
      }

      const packagePrice =
        roundCurrency(
          manualBooking.package_price
        );

      const previousAmountPaid =
        roundCurrency(
          manualBooking.amount_paid
        );

      const previousBalance =
        roundCurrency(
          manualBooking.remaining_balance
        );

      if (
        previousBalance <= 0 ||
        manualBooking.payment_status ===
          "PAID"
      ) {
        return sendJson(
          res,
          409,
          {
            error:
              "This booking is already fully paid.",
          }
        );
      }

      if (
        amountReceived >
        previousBalance
      ) {
        return sendJson(
          res,
          400,
          {
            error:
              `Payment cannot be higher than the remaining balance of ₱${previousBalance.toLocaleString(
                "en-PH"
              )}.`,
          }
        );
      }

      const newAmountPaid =
        roundCurrency(
          previousAmountPaid +
            amountReceived
        );

      const newRemainingBalance =
        roundCurrency(
          Math.max(
            packagePrice -
              newAmountPaid,
            0
          )
        );

      const newPaymentStatus =
        newRemainingBalance <= 0
          ? "PAID"
          : "PARTIAL";

      const encodedBookingId =
        encodeURIComponent(
          bookingId
        );

      /*
       * Update Supabase first.
       */
      const updated =
        await supabaseRequest(
          `manual_bookings?id=eq.${encodedBookingId}`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                payment_status:
                  newPaymentStatus,

                amount_paid:
                  newAmountPaid,

                remaining_balance:
                  newRemainingBalance,

                payment_provider:
                  paymentMethod,

                payment_reference:
                  paymentReference || null,
              }),
          }
        );

      if (
        !updated?.length
      ) {
        return sendJson(
          res,
          404,
          {
            error:
              "The booking could not be updated.",
          }
        );
      }

      /*
       * Update the matching Google Sheet row.
       *
       * If the Sheet update fails, restore
       * the previous Supabase totals.
       */
      let externalResult;

      if (
        cleanText(
          manualBooking.calendar_status
        ).toUpperCase() !==
        "NOT_REQUIRED"
      ) {
        try {
          externalResult =
            await recordManualBookingPaymentExternally(
              {
                bookingReference:
                  manualBooking.booking_reference,

                paymentStatus:
                  newPaymentStatus,

                amountPaid:
                  newAmountPaid,

                remainingBalance:
                  newRemainingBalance,

                amountReceived,

                paymentMethod,

                paymentReference,

                paymentDate,

                paymentNotes,
              }
            );
        } catch (
          externalError
        ) {
          console.error(
            "Payment Sheet sync failed. Rolling back Supabase:",
            externalError
          );

          try {
            await supabaseRequest(
              `manual_bookings?id=eq.${encodedBookingId}`,
              {
                method:
                  "PATCH",

                body:
                  JSON.stringify({
                    payment_status:
                      manualBooking.payment_status,

                    amount_paid:
                      previousAmountPaid,

                    remaining_balance:
                      previousBalance,

                    payment_provider:
                      manualBooking.payment_provider,

                    payment_reference:
                      manualBooking.payment_reference,
                  }),
              }
            );
          } catch (
            rollbackError
          ) {
            console.error(
              "Payment rollback failed:",
              rollbackError
            );

            throw new Error(
              "The Google Sheet payment update failed, and the Supabase rollback also failed. Please check this booking manually."
            );
          }

          throw new Error(
            externalError.message ||
              "The payment was not recorded because the Google Sheet could not be updated."
          );
        }
      }

      await recordPaymentTransaction({
        booking: {
          ...manualBooking,
          ...updated[0],
        },
        amount: amountReceived,
        paymentDate,
        paymentMethod,
        paymentProvider: paymentMethod,
        paymentReference,
        source: "MANUAL_PAYMENT",
        notes: paymentNotes,
      });

      return sendJson(
        res,
        200,
        {
          success:
            true,

          booking:
            updated[0],

          payment: {
            amountReceived,

            paymentMethod,

            paymentReference,

            paymentDate,

            paymentNotes,
          },

          sheetUpdated:
            Boolean(
              externalResult?.sheetUpdated
            ),

          message:
            newPaymentStatus ===
            "PAID"
              ? "Payment recorded. This booking is now fully paid."
              : "Partial payment recorded successfully.",
        }
      );
    }

    /*
     * Delete a manual booking.
     */
    if (
      req.method === "DELETE"
    ) {
      const bookingId =
        cleanText(
          req.body?.id
        );

      if (!bookingId) {
        return sendJson(
          res,
          400,
          {
            error:
              "Manual booking ID is required.",
          }
        );
      }

      const manualBooking =
        await getManualBookingById(
          bookingId
        );

      if (!manualBooking) {
        return sendJson(
          res,
          404,
          {
            error:
              "Manual booking not found.",
          }
        );
      }

      /*
       * First delete the Google Calendar
       * event and Google Sheet row.
       */
      const externalDeleteResult =
        cleanText(
          manualBooking.calendar_status
        ).toUpperCase() ===
        "NOT_REQUIRED"
          ? {
              calendarDeleted: false,
              sheetRowsDeleted: 0,
            }
          : await deleteManualBookingRecords(
              manualBooking
            );

      /*
       * Then remove the Supabase record.
       */
      const encodedBookingId =
        encodeURIComponent(
          bookingId
        );

      const deleted =
        await supabaseRequest(
          `manual_bookings?id=eq.${encodedBookingId}`,
          {
            method:
              "DELETE",
          }
        );

      if (
        !deleted?.length
      ) {
        return sendJson(
          res,
          404,
          {
            error:
              "The booking was removed from Google Calendar and Sheets, but the Supabase record could not be found.",
          }
        );
      }

      return sendJson(
        res,
        200,
        {
          success:
            true,

          booking:
            deleted[0],

          calendarDeleted:
            Boolean(
              externalDeleteResult.calendarDeleted
            ),

          sheetRowsDeleted:
            Number(
              externalDeleteResult.sheetRowsDeleted ||
                0
            ),

          message:
            "Manual booking deleted successfully.",
        }
      );
    }

    return sendJson(
      res,
      405,
      {
        error:
          "Method not allowed.",
      }
    );
  } catch (error) {
    console.error(
      "Admin manual booking API error:",
      error
    );

    return sendJson(
      res,
      500,
      {
        error:
          error.message ||
          "Something went wrong.",
      }
    );
  }
}
