import type { DmxColorPreset } from "./dotmatrix-core";

const PRESET_TOKENS: Record<
  DmxColorPreset,
  { resolvedColor: string; dotFill: string }
> = {
  brand: {
    resolvedColor: "var(--dmx-preset-brand-fg, #3182ce)",
    dotFill: "currentColor",
  },
  neutral: {
    resolvedColor: "var(--dmx-preset-neutral-fg, currentColor)",
    dotFill: "currentColor",
  },
  inverse: {
    resolvedColor: "var(--dmx-preset-inverse-fg, #f7fafc)",
    dotFill: "currentColor",
  },
};

export function resolveDmxColorTokens(
  color: string,
  colorPreset?: DmxColorPreset
) {
  if (colorPreset && PRESET_TOKENS[colorPreset]) {
    return PRESET_TOKENS[colorPreset];
  }
  return { resolvedColor: color, dotFill: "currentColor" };
}
