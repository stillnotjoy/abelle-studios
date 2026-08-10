// api/admin-manual-bookings.js

import { requireAdmin } from "../server/adminAuth.js";

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

      const packagePrice =
        Number(
          selectedPackage.default_price
        );

      const durationMinutes =
        Number(
          selectedPackage.duration_minutes ||
            40
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
        Math.max(
          packagePrice -
            amountPaid,
          0
        );

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

        shoot_status:
          "SCHEDULED",

        post_production_status:
          "NOT_STARTED",

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
          calendarResult.eventId ||
          "",

        calendar_status:
          "CREATED",
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

      return sendJson(
        res,
        201,
        {
          booking:
            created?.[0] ||
            null,

          calendarEventId:
            calendarResult.eventId ||
            "",
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
        await deleteManualBookingRecords(
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
