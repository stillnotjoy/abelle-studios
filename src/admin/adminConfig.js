export const ADMIN_PIN_FALLBACK = "1234";

export const MANUAL_BOOKING_PACKAGES = [
  { title: "Personal Portraits", price: 499 },
  { title: "Duo Portraits", price: 899 },
  { title: "Barkada Shoot", price: 999 },
  { title: "Family Portrait", price: 1299 },
];

export const MANUAL_BOOKING_SLOTS = [
  { label: "9:00 AM", value: "09:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "5:00 PM", value: "17:00" },
];

export const ADMIN_TABS = [
  "Dashboard",
  "Bookings",
  "Discount Codes",
  "Packages",
  "Blocked Dates",
  "Settings",
];

export function getSavedAdminPin() {
  if (typeof window === "undefined") return ADMIN_PIN_FALLBACK;
  const savedPin = localStorage.getItem("abelleAdminPin");
  if (savedPin) return savedPin;
  localStorage.setItem("abelleAdminPin", ADMIN_PIN_FALLBACK);
  return ADMIN_PIN_FALLBACK;
}
