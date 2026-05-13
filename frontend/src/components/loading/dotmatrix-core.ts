import { clsx, type ClassValue } from "clsx";

export function cx(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function stylePx(value: number): string {
  return `${value}px`;
}

export function styleOpacity(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

const DEFAULT_LOW = 0.08;
const DEFAULT_HIGH = 0.94;

export function remapOpacityToTriplet(
  opacity: number,
  opacityBase?: number,
  opacityMid?: number,
  opacityPeak?: number
): number {
  if (opacityBase == null && opacityMid == null && opacityPeak == null) {
    return opacity;
  }
  const ob = opacityBase ?? DEFAULT_LOW;
  const op = opacityPeak ?? DEFAULT_HIGH;
  const om = opacityMid ?? ob + (op - ob) / 2;
  const t = Math.max(
    0,
    Math.min(1, (opacity - DEFAULT_LOW) / (DEFAULT_HIGH - DEFAULT_LOW || 1))
  );
  if (t <= 0.5) {
    return ob + (om - ob) * (t / 0.5);
  }
  return om + (op - om) * ((t - 0.5) / 0.5);
}

export type DmxColorPreset = "brand" | "neutral" | "inverse";

export type DotMatrixCommonProps = {
  size?: number;
  dotSize?: number;
  color?: string;
  colorPreset?: DmxColorPreset;
  ariaLabel?: string;
  className?: string;
  muted?: boolean;
  bloom?: boolean;
  halo?: number;
  dotClassName?: string;
  speed?: number;
  animated?: boolean;
  hoverAnimated?: boolean;
  cellPadding?: number;
  opacityBase?: number;
  opacityMid?: number;
  opacityPeak?: number;
  /** Hide from assistive tech (e.g. Chakra Button `spinner` slot). */
  silent?: boolean;
};
