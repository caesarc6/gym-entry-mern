/**
 * Capitalizes the first letter of each word in a name
 * @param {string} name - The name to capitalize
 * @returns {string} - The capitalized name
 */
export const capitalizeName = (name) => {
  if (!name || typeof name !== "string") return "";

  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Normalizes a name for database storage (lowercase)
 * @param {string} name - The name to normalize
 * @returns {string} - The normalized name in lowercase
 */
export const normalizeNameForStorage = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase();
};
