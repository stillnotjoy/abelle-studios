import { randomInt } from "node:crypto";

export function getShootTypeCode(packageTitle) {
  const title = String(packageTitle || "")
    .trim()
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

  if (title.includes("event")) {
    return "E";
  }

  if (title.includes("family")) {
    return "F";
  }

  if (
    title.includes("solo") ||
    title.includes("portrait")
  ) {
    return "S";
  }

  return "X";
}

export function createOnlineBookingReference(
  date,
  packageTitle
) {
  const cleanDate = String(date || "")
    .trim()
    .replaceAll("-", "")
    .slice(2);

  if (!/^\d{6}$/.test(cleanDate)) {
    throw new Error(
      "A valid shoot date is required to create the booking reference."
    );
  }

  const shootType =
    getShootTypeCode(packageTitle);
  const uniqueNumber = randomInt(1000, 10000);

  return `AB-O-${shootType}-${cleanDate}-${uniqueNumber}`;
}
