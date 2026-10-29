import { registerPlugin } from "@capacitor/core";
import { isCapacitorNative } from "./isNativePlatform";

const CropGestures = registerPlugin("CropGestures");

let pending = Promise.resolve();

/**
 * While a crop is open, the iOS shell must deliver pinch and vertical pans to
 * the page. The rest of the app keeps pinch-zoom locked.
 * Calls are serialized so a close cannot overtake an open.
 */
export function setNativeCropGestures(active) {
  if (!isCapacitorNative()) return Promise.resolve();
  pending = pending
    .catch(() => {})
    .then(() => CropGestures.setActive({ active }))
    .catch(() => {});
  return pending;
}
