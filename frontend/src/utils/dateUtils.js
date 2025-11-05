/**
 * Utility functions for handling dates consistently across the application
 */

/**
 * Safely formats a date string to display as a local date
 * Handles timezone issues by ensuring the date is treated as local time
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date string (MM/DD/YYYY)
 */
export const formatDateSafe = (dateString) => {
  if (!dateString) return "";

  try {
    // If it's already a Date object, use it directly
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      // Handle both ISO strings and YYYY-MM-DD format
      if (typeof dateString === "string" && dateString.includes("T")) {
        // It's an ISO string, check for timezone issues
        const isoDate = new Date(dateString);

        // Check if this is likely a timezone issue:
        // Any date that ends with T00:00:00.000Z or similar is likely a timezone issue
        // because it was stored as UTC midnight when it should be local midnight
        const isLikelyTimezoneIssue =
          dateString.endsWith("T00:00:00.000Z") ||
          dateString.endsWith("T00:00:00Z") ||
          (isoDate.getUTCHours() === 0 &&
            isoDate.getUTCMinutes() === 0 &&
            isoDate.getUTCSeconds() === 0);

        if (isLikelyTimezoneIssue) {
          // Extract the date part and treat it as local time
          const dateOnly = dateString.split("T")[0];
          const [year, month, day] = dateOnly.split("-");
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          date = isoDate;
        }
      } else {
        // It's a YYYY-MM-DD string, treat as local date
        const [year, month, day] = dateString.split("-");
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    return date.toLocaleDateString();
  } catch (error) {
    return "";
  }
};

/**
 * Formats a date for display with time
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date and time string
 */
export const formatDateTimeSafe = (dateString) => {
  if (!dateString) return "";

  try {
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      if (typeof dateString === "string" && dateString.includes("T")) {
        date = new Date(dateString);
      } else {
        const [year, month, day] = dateString.split("-");
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    return date.toLocaleString();
  } catch (error) {
    return "";
  }
};

/**
 * Gets today's date in YYYY-MM-DD format for form inputs
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Converts a date string to a Date object, handling timezone issues
 * @param {string} dateString - Date string in YYYY-MM-DD or ISO format
 * @returns {Date} - Date object in local timezone
 */
export const parseDateSafe = (dateString) => {
  if (!dateString) return null;

  try {
    if (typeof dateString === "string" && !dateString.includes("T")) {
      // YYYY-MM-DD format - treat as local date
      const [year, month, day] = dateString.split("-");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (typeof dateString === "string" && dateString.includes("T")) {
      // ISO string - check for timezone issues
      const isoDate = new Date(dateString);

      // Check if this is likely a timezone issue:
      // Any date that ends with T00:00:00.000Z or similar is likely stored as UTC midnight
      // when it should be interpreted as a local date
      const isLikelyTimezoneIssue =
        dateString.endsWith("T00:00:00.000Z") ||
        dateString.endsWith("T00:00:00Z") ||
        (isoDate.getUTCHours() === 0 &&
          isoDate.getUTCMinutes() === 0 &&
          isoDate.getUTCSeconds() === 0);

      if (isLikelyTimezoneIssue) {
        // Extract the date part and treat it as local time
        const dateOnly = dateString.split("T")[0];
        const [year, month, day] = dateOnly.split("-");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        return isoDate;
      }
    } else {
      // Already a Date object or other format
      return new Date(dateString);
    }
  } catch (error) {
    return null;
  }
};
