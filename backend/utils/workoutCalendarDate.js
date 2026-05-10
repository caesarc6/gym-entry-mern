/**
 * Helpers for aligning workout streak / habit calendar cells with calendar days
 * in a specific IANA time zone (e.g. user's device TZ), instead of always using
 * UTC date parts from ISO strings.
 */

const MAX_HEADER_TZ_LEN = 120;

/** @returns {string} Canonical IANA ID or `"UTC"` */
export function normalizeWorkoutCalendarTimeZone(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw || raw.length > MAX_HEADER_TZ_LEN) {
    return "UTC";
  }

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return "UTC";
  }
}

/** @param {Date | string | number} value */
export function calendarDateKeyInTimeZone(value, timeZone = "UTC") {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString().slice(0, 10);
  }
}

/**
 * Moves a YYYY-MM-DD key forward/back by `deltaDays` using proleptic Gregorian
 * arithmetic — the same calendar-day sequence Intl uses across local midnights.
 *
 * @param {string} ymdKey `"YYYY-MM-DD"`
 * @param {number} deltaDays
 */
export function addGregorianDaysToDateKey(ymdKey, deltaDays) {
  const parts = ymdKey.split("-").map(Number);
  if (
    parts.length !== 3 ||
    parts.some((n) => !Number.isFinite(n))
  ) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);

  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return `${yy}-${mm}-${dd}`;
}
