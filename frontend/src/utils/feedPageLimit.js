import { isCapacitorNative } from "./isNativePlatform";

/** Page length shared by the home feed, profile posts, and optimistic cache seeds. */
export function feedPageLimit() {
  return isCapacitorNative() ? 4 : 6;
}
