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

const isSanitizeOptions = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) => key === "trim"),
  );

/**
 * Clean user-authored text before it is persisted or used in searches.
 * This app renders these fields as plain text, so no HTML tags are allowed.
 *
 * Safe as a Mongoose String setter: Mongoose calls
 * `setter(value, priorVal, schematype)`, and `priorVal` is often `null`.
 * Do not destructure the second argument as `{ trim }` — that throws on null.
 */
export const sanitizeTextInput = (value, options) => {
  if (value == null) return value;
  const trim = isSanitizeOptions(options) ? options.trim !== false : true;
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
