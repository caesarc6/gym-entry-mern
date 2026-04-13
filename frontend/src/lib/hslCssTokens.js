/**
 * Helpers for shadcn-style CSS variables: `H S% L%` (no hsl() wrapper).
 */

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** @param {string} triplet e.g. "222.2 84% 4.9%" */
export function hslTripletToHex(triplet) {
  const m = String(triplet).trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return "#808080";
  const h = (parseFloat(m[1]) % 360) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to255 = (v) =>
    Math.round(Math.min(255, Math.max(0, v * 255)));
  return `#${[to255(r), to255(g), to255(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** @param {string} hex #rrggbb */
export function hexToHslTriplet(hex) {
  const raw = hex.replace(/^#/, "");
  if (raw.length !== 6) return "0 0% 50%";
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 3600) / 10} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}

/** Build React style object for a token map */
export function tokensToStyleObject(tokens) {
  const out = {};
  for (const [key, value] of Object.entries(tokens)) {
    out[`--${key}`] = value;
  }
  return out;
}
