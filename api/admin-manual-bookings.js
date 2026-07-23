// api/admin-manual-bookings.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_PIN =
  process.env.ADMIN_DISCOUNT_PIN ||
  process.env.ADMIN_PIN ||
  "1234";

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

function sendJson(res, status, data) {
  return res.status(status).json(data);
}

function cleanText(value) {
  return String(value || "").trim();
}

function requireAdmin(req, res) {
  const pinFromHeader =
    req.headers["x-admin-pin"];

  if (!ADMIN_PIN) {
    sendJson(res, 500, {
      error: "ADMIN_PIN is not configured.",
    });

    return false;
  }

  if (
    !pinFromHeader ||
    pinFromHeader !== ADMIN_PIN
  ) {
    sendJson(res, 401, {
      error: "Unauthorized admin request.",
    });

    return false;
  }

  return true;
}

function getBookingReference(date, time) {
  const cleanDate = cleanText(date)
    .replaceAll("-", "");

  const cleanTime = cleanText(time)
    .replace(":", "");

  return (
    `ABELLE-MANUAL-${cleanDate}-${cleanTime}-` +
    Date.now()
  );
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
  };

  const appsScriptResponse = await fetch(
    appsScriptUrl,
    {
      method: "POST",
      headers: {
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
      text
    );

    throw new Error(
      "Could not read Apps Script response."
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
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        secret: appsScriptSecret,
        action: "delete_manual_booking",

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

export default async function handler(
  req,
  res
) {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    if (req.method === "GET") {
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

    if (req.method === "POST") {
      const body = req.body || {};

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

      const paymentStatus =
        cleanText(
          body.paymentStatus || "UNPAID"
        ).toUpperCase();

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

      const selectedPackage =
        await getPackageById(packageId);

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

      const packagePrice = Number(
        selectedPackage.default_price
      );

      const durationMinutes = Number(
        selectedPackage.duration_minutes ||
          40
      );

      if (
        !Number.isFinite(packagePrice) ||
        packagePrice < 0
      ) {
        return sendJson(res, 500, {
          error:
            "The selected package has an invalid price.",
        });
      }

      let amountPaid = Number(
        body.amountPaid || 0
      );

      if (
        !Number.isFinite(amountPaid) ||
        amountPaid < 0
      ) {
        return sendJson(res, 400, {
          error:
            "Amount paid must be 0 or higher.",
        });
      }

      if (paymentStatus === "UNPAID") {
        amountPaid = 0;
      }

      if (paymentStatus === "PAID") {
        amountPaid = packagePrice;
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

      if (amountPaid > packagePrice) {
        return sendJson(res, 400, {
          error:
            "Amount paid cannot be higher than the package price.",
        });
      }

      const remainingBalance =
        Math.max(
          packagePrice - amountPaid,
          0
        );

      const bookingReference =
        getBookingReference(
          shootDate,
          shootTime
        );

      const manualBookingPayload = {
        booking_reference:
          bookingReference,

        client_name:
          clientName,

        email,
        phone,

        /*
         * These are used when sending
         * the booking to Apps Script.
         * They are removed before the
         * Supabase insert because your
         * current manual_bookings table
         * may not have these columns.
         */
        package_id:
          selectedPackage.id,

        duration_minutes:
          durationMinutes,

        package_title:
          selectedPackage.name,

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

        booking_status:
          "CONFIRMED",

        notes,
      };

      const calendarResult =
        await createManualBookingInCalendar(
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
          calendarResult.eventId || "",

        calendar_status:
          "CREATED",
      };

      const created =
        await supabaseRequest(
          "manual_bookings",
          {
            method: "POST",
            body: JSON.stringify(
              databasePayload
            ),
          }
        );

      return sendJson(res, 201, {
        booking:
          created?.[0] || null,

        calendarEventId:
          calendarResult.eventId || "",
      });
    }

    if (req.method === "DELETE") {
      const bookingId = cleanText(
        req.body?.id
      );

      if (!bookingId) {
        return sendJson(res, 400, {
          error:
            "Manual booking ID is required.",
        });
      }

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
              "calendar_event_id",
            ].join(","),
            `&id=eq.${encodedBookingId}`,
            "&limit=1",
          ].join("")
        );

      const manualBooking =
        bookings?.[0];

      if (!manualBooking) {
        return sendJson(res, 404, {
          error:
            "Manual booking not found.",
        });
      }

      /*
       * First delete the Google Calendar
       * event and Google Sheet row.
       */
      const externalDeleteResult =
        await deleteManualBookingRecords(
          manualBooking
        );

      /*
       * Then remove the Supabase record.
       */
      const deleted =
        await supabaseRequest(
          `manual_bookings?id=eq.${encodedBookingId}`,
          {
            method: "DELETE",
          }
        );

      if (!deleted?.length) {
        return sendJson(res, 404, {
          error:
            "The booking was removed from Google Calendar and Sheets, but the Supabase record could not be found.",
        });
      }

      return sendJson(res, 200, {
        success: true,
        booking: deleted[0],
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
      });
    }


    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error(
      "Admin manual booking API error:",
      error
    );

    return sendJson(res, 500, {
      error:
        error.message ||
        "Something went wrong.",
    });
  }
}