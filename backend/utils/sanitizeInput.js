import sanitizeHtml from "sanitize-html";

const HTML_STRIP_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

const decodeSafeEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");

/**
 * Clean user-authored text before it is persisted or used in searches.
 * This app renders these fields as plain text, so no HTML tags are allowed.
 */
export const sanitizeTextInput = (value, { trim = true } = {}) => {
  if (value == null) return value;
  const text = typeof value === "string" ? value : String(value);
  const sanitized = decodeSafeEntities(sanitizeHtml(text, HTML_STRIP_OPTIONS));
  return trim ? sanitized.trim() : sanitized;
};

export const sanitizeTextFields = (source, fieldNames) => {
  const sanitized = {};

  for (const fieldName of fieldNames) {
    if (source?.[fieldName] !== undefined) {
      sanitized[fieldName] = sanitizeTextInput(source[fieldName]);
    }
  }

  return sanitized;
};

export const sanitizeTextArray = (values) =>
  Array.isArray(values)
    ? values.map((value) => sanitizeTextInput(value)).filter(Boolean)
    : values;

export const sanitizeObjectTextFields = (source, fieldNames) => {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return source;
  }

  return {
    ...source,
    ...sanitizeTextFields(source, fieldNames),
  };
};
