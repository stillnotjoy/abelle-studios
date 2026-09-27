const CANCELLED_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "DECLINED",
  "EXPIRED",
  "VOID",
]);

function cleanText(value) {
  return String(value || "").trim();
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

export function normalizeCustomerPhone(value) {
  let digits = cleanText(value).replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `63${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 10) {
    return `63${digits}`;
  }

  return digits;
}

function hashIdentity(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `customer-${(hash >>> 0).toString(36)}`;
}

export function buildCustomerDirectory(bookings) {
  const usableBookings = bookings.filter((booking) =>
    cleanText(booking.client_name)
  );
  const parents = usableBookings.map((_, index) => index);
  const knownIdentifiers = new Map();

  function find(index) {
    if (parents[index] !== index) {
      parents[index] = find(parents[index]);
    }

    return parents[index];
  }

  function unite(first, second) {
    const firstRoot = find(first);
    const secondRoot = find(second);

    if (firstRoot !== secondRoot) {
      parents[secondRoot] = firstRoot;
    }
  }

  usableBookings.forEach((booking, index) => {
    const identifiers = [];
    const phone = normalizeCustomerPhone(booking.phone);
    const email = normalizeEmail(booking.email);

    if (phone) {
      identifiers.push(`phone:${phone}`);
    }

    if (email) {
      identifiers.push(`email:${email}`);
    }

    identifiers.forEach((identifier) => {
      if (knownIdentifiers.has(identifier)) {
        unite(index, knownIdentifiers.get(identifier));
      } else {
        knownIdentifiers.set(identifier, index);
      }
    });
  });

  const grouped = new Map();

  usableBookings.forEach((booking, index) => {
    const root = find(index);
    const existing = grouped.get(root) || [];
    existing.push(booking);
    grouped.set(root, existing);
  });

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return [...grouped.values()]
    .map((customerBookings) => {
      const sortedBookings = [...customerBookings].sort((first, second) =>
        cleanText(second.shoot_date).localeCompare(
          cleanText(first.shoot_date)
        )
      );
      const activeBookings = sortedBookings.filter(
        (booking) =>
          !CANCELLED_STATUSES.has(
            cleanText(booking.booking_status).toUpperCase()
          )
      );
      const latestContact =
        sortedBookings.find(
          (booking) =>
            cleanText(booking.phone) || cleanText(booking.email)
        ) || sortedBookings[0];
      const latestBooking = activeBookings[0] || sortedBookings[0];
      const firstBooking =
        activeBookings[activeBookings.length - 1] ||
        sortedBookings[sortedBookings.length - 1];
      const phone = cleanText(latestContact.phone);
      const email = cleanText(latestContact.email);
      const identity =
        normalizeCustomerPhone(phone) ||
        normalizeEmail(email) ||
        `${cleanText(latestContact.client_name).toLowerCase()}:${latestContact.id}`;
      const totalSpent = money(
        activeBookings.reduce(
          (total, booking) => total + money(booking.amount_paid),
          0
        )
      );
      const outstandingBalance = money(
        activeBookings.reduce(
          (total, booking) =>
            total + money(booking.remaining_balance),
          0
        )
      );
      const upcomingCount = activeBookings.filter(
        (booking) => cleanText(booking.shoot_date) >= today
      ).length;

      return {
        id: hashIdentity(identity),
        name: cleanText(latestContact.client_name),
        email,
        phone,
        bookingCount: activeBookings.length,
        totalSpent,
        outstandingBalance,
        upcomingCount,
        firstBookingDate: firstBooking?.shoot_date || null,
        lastBookingDate: latestBooking?.shoot_date || null,
        latestPackage: cleanText(latestBooking?.package_title),
        sources: [
          ...new Set(
            activeBookings
              .map((booking) => cleanText(booking.booking_source))
              .filter(Boolean)
          ),
        ],
        bookings: sortedBookings.map((booking) => ({
          id: booking.id,
          bookingReference: booking.booking_reference,
          packageTitle: booking.package_title,
          packagePrice: money(booking.package_price),
          shootDate: booking.shoot_date,
          shootTime: booking.shoot_time,
          bookingStatus: booking.booking_status,
          paymentStatus: booking.payment_status,
          amountPaid: money(booking.amount_paid),
          remainingBalance: money(booking.remaining_balance),
          bookingSource: booking.booking_source,
          postProductionStatus: booking.post_production_status,
        })),
      };
    })
    .sort((first, second) =>
      cleanText(second.lastBookingDate).localeCompare(
        cleanText(first.lastBookingDate)
      )
    );
}

export function summarizeCustomers(customers) {
  return {
    totalCustomers: customers.length,
    repeatCustomers: customers.filter(
      (customer) => customer.bookingCount > 1
    ).length,
    customersWithMobile: customers.filter((customer) =>
      normalizeCustomerPhone(customer.phone)
    ).length,
    totalCustomerValue: money(
      customers.reduce(
        (total, customer) => total + customer.totalSpent,
        0
      )
    ),
  };
}
