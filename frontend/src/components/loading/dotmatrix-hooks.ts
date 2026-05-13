import { useCallback, useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type MatrixPhase = "idle" | "active";

export function useDotMatrixPhases(opts: {
  animated: boolean;
  hoverAnimated: boolean;
  speed: number;
}) {
  const { animated, hoverAnimated } = opts;
  const [hover, setHover] = useState(false);
  const phase: MatrixPhase =
    animated || (hoverAnimated && hover) ? "active" : "idle";
  return {
    phase,
    onMouseEnter: useCallback(() => setHover(true), []),
    onMouseLeave: useCallback(() => setHover(false), []),
  };
}

export function useCyclePhase(opts: {
  active: boolean;
  cycleMsBase: number;
  speed: number;
}): number {
  const { active, cycleMsBase, speed } = opts;
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) {
      setPhase(0.1);
      return;
    }
    const cycleMs = cycleMsBase / Math.max(0.25, speed);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setPhase(((now - t0) % cycleMs) / cycleMs);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, cycleMsBase, speed]);
  return phase;
}
