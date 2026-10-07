const lightProfileUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightProfileUrl = new URL("../assets/night.jpg", import.meta.url).href;

/** Theme-specific picture used when someone has not uploaded a profile photo. */
export function defaultProfileImageUrl(theme) {
  return theme === "light" ? lightProfileUrl : nightProfileUrl;
}

export function isUploadedProfilePhoto(src) {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  return trimmed !== lightProfileUrl && trimmed !== nightProfileUrl;
}

/** Real upload when present, otherwise the light or dark default. */
export function profileImageSrc(src, theme) {
  return isUploadedProfilePhoto(src) ? src.trim() : defaultProfileImageUrl(theme);
}
