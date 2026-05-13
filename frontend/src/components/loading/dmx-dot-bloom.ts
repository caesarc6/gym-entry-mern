export function dmxBloomRootActive(bloom: boolean, halo: number): boolean {
  return Boolean(bloom || halo > 0);
}

export function dmxDotBloomParts(
  isActive: boolean,
  opacity: number,
  bloom: boolean,
  halo: number,
  opacityBase?: number,
  _opacityMid?: number,
  _opacityPeak?: number
) {
  const base = opacityBase ?? 0.08;
  const level =
    halo > 0 ? String(Math.min(1, halo)) : bloom && isActive ? "0.4" : "0";
  const bloomDot = Boolean(bloom && isActive && opacity > base + 0.02);
  return { bloomDot, level };
}
