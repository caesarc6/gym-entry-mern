/**
 * Count user-perceived characters (grapheme clusters).
 * One emoji counts as one character when the runtime supports Intl.Segmenter.
 */
export const graphemeLength = (value) => {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const trimmed = text.trim();
  if (!trimmed) return 0;

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return [
      ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
        trimmed,
      ),
    ].length;
  }

  return Array.from(trimmed).length;
};
