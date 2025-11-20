// Buffer polyfill for Node.js compatibility
// This file must be imported/required before any modules that use Buffer
import { Buffer } from "buffer";

// Set Buffer on all possible global objects
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
}
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

export { Buffer };

