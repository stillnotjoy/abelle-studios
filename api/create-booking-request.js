const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function cleanText(value) {
  return String(value || "").trim();
}

async function getPackageFromSupabase(packageId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const encodedPackageId = encodeURIComponent(packageId);

  const url =
    `${SUPABASE_URL}/rest/v1/abelle_packages` +
    `?select=id,name,description,default_price,default_deposit,duration_minutes,is_active` +
    `&id=eq.${encodedPackageId}` +
    `&limit=1`;

  const supabaseResponse = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const responseText = await supabaseResponse.text();

  let data = null;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    data = responseText;
  }

  if (!supabaseResponse.ok) {
    console.error(
      "Supabase package lookup failed:",
      data
    );

    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "Could not retrieve the selected package."
    );
  }

  return Array.isArray(data) ? data[0] || null : null;
}

function getOnlineBookingReference(
  data,
  date,
  time
) {
  const appsScriptReference = cleanText(
    data?.bookingReference
  );

  if (appsScriptReference) {
    return appsScriptReference;
  }

  const cleanDate = date.replaceAll("-", "");
  const cleanTime = time.replace(":", "");

  return `ABELLE-${cleanDate}-${cleanTime}`;
}

async function saveOnlineBookingToCrm({
  bookingReference,
  customerName,
  email,
  phone,
  selectedPackage,
  date,
  time,
  notes,
  calendarData,
}) {
  const calendarEventId = cleanText(
    calendarData?.eventId ||
      calendarData?.calendarEventId
  );

  const crmResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/manual_bookings?on_conflict=booking_reference`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer:
          "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        booking_reference: bookingReference,
        client_name: customerName,
        email,
        phone,
        package_title: selectedPackage.name,
        package_price: Number(
          selectedPackage.default_price
        ),
        shoot_date: date,
        shoot_time: time,
        notes,
        payment_status: "UNPAID",
        amount_paid: 0,
        remaining_balance: Number(
          selectedPackage.default_price
        ),
        booking_status: "PENDING",
        calendar_event_id:
          calendarEventId || null,
        calendar_status: calendarEventId
          ? "CREATED"
          : "PENDING",
        booking_source: "WEBSITE",
        payment_provider: "GCASH",
        payment_option:
          "dp_gcash_balance_instudio",
        shoot_status: "SCHEDULED",
        post_production_status:
          "NOT_STARTED",
      }),
    }
  );

  const responseText =
    await crmResponse.text();

  let crmData = null;

  try {
    crmData = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    crmData = responseText;
  }

  if (!crmResponse.ok) {
    console.error(
      "CRM booking save failed:",
      crmData
    );

    throw new Error(
      typeof crmData === "object" &&
        crmData?.message
        ? crmData.message
        : "The booking reached the calendar but could not be added to the CRM."
    );
  }

  return Array.isArray(crmData)
    ? crmData[0] || null
    : crmData;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, 405, {
      error: "Method not allowed.",
    });
  }

  try {
    const appsScriptUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL;

    const appsScriptSecret =
      process.env.GOOGLE_APPS_SCRIPT_SECRET;

    if (!appsScriptUrl || !appsScriptSecret) {
      return sendJson(response, 500, {
        error:
          "Missing Apps Script environment variables.",
      });
    }

    const body = request.body || {};

    const packageId = cleanText(body.packageId);
    const date = cleanText(body.date);
    const time = cleanText(body.time);
    const customerName = cleanText(body.name);
    const phone = cleanText(body.phone);
    const email = cleanText(body.email);
    const notes = cleanText(body.notes);

    if (!packageId) {
      return sendJson(response, 400, {
        error: "Please select a studio package.",
      });
    }

    if (
      !date ||
      !time ||
      !customerName ||
      !phone ||
      !email
    ) {
      return sendJson(response, 400, {
        error:
          "Please complete all required booking details.",
      });
    }

    const selectedPackage =
      await getPackageFromSupabase(packageId);

    if (!selectedPackage) {
      return sendJson(response, 404, {
        error:
          "The selected package could not be found.",
      });
    }

    if (!selectedPackage.is_active) {
      return sendJson(response, 409, {
        error:
          "This package is no longer available for booking. Please choose another package.",
      });
    }

    const packagePrice = Number(
      selectedPackage.default_price
    );

    const packageDeposit = Number(
      selectedPackage.default_deposit || 0
    );

    const durationMinutes = Number(
      selectedPackage.duration_minutes || 60
    );

    if (
      !Number.isFinite(packagePrice) ||
      packagePrice < 0
    ) {
      return sendJson(response, 500, {
        error:
          "The selected package has an invalid price.",
      });
    }

    if (
      !Number.isFinite(packageDeposit) ||
      packageDeposit < 0
    ) {
      return sendJson(response, 500, {
        error:
          "The selected package has an invalid deposit.",
      });
    }

    if (packageDeposit > packagePrice) {
      return sendJson(response, 500, {
        error:
          "The package deposit cannot be higher than the package price.",
      });
    }

    const amountDueToday = packageDeposit;

    const remainingBalance = Math.max(
      packagePrice - amountDueToday,
      0
    );

    const bookingPayload = {
      secret: appsScriptSecret,
      action: "create_pending_booking",

      packageId: selectedPackage.id,
      packageTitle: selectedPackage.name,
      packageDescription:
        selectedPackage.description || "",
      packagePrice,
      packageDeposit,
      durationMinutes,

      amountDueToday,
      remainingBalance,

      date,
      time,
      name: customerName,
      phone,
      email,
      notes,

      paymentOption:
        "dp_gcash_balance_instudio",

      discountCode: "",
      discountAmount: 0,
    };

    const appsScriptResponse = await fetch(
      appsScriptUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      }
    );

    const responseText =
      await appsScriptResponse.text();

    let data;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      console.error(
        "Apps Script returned non-JSON:",
        responseText
      );

      return sendJson(response, 500, {
        error:
          "Could not read Apps Script response.",
      });
    }

    if (!appsScriptResponse.ok || !data.ok) {
      console.error(
        "Apps Script booking error:",
        data
      );

      return sendJson(response, 500, {
        error:
          data.error ||
          "Could not save booking request.",
        details: data,
      });
    }

    const bookingReference =
      getOnlineBookingReference(
        data,
        date,
        time
      );

    const crmBooking =
      await saveOnlineBookingToCrm({
        bookingReference,
        customerName,
        email,
        phone,
        selectedPackage,
        date,
        time,
        notes,
        calendarData: data,
      });

    return sendJson(response, 200, {
      ...data,
      bookingReference,
      crmBooking,
    });
  } catch (error) {
    console.error(
      "Booking request error:",
      error
    );

    return sendJson(response, 500, {
      error:
        error.message ||
        "Something went wrong while saving the booking request.",
    });
  }
}
