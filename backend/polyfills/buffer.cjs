// Buffer polyfill for Node.js compatibility (CommonJS version)
// This file is loaded via --require flag to ensure Buffer is available
// before any modules (including CommonJS dependencies) are loaded
const { Buffer } = require('buffer');

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

module.exports = { Buffer };

