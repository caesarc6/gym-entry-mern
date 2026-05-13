import type { ComponentProps } from "react";
import { Box } from "@chakra-ui/react";
import { DotmTriangle20 } from "./DotmTriangle20";

/**
 * Design-system presets for the dot-matrix triangle loader (`DotmTriangle20`).
 * Use `variant` on {@link LoadingIndicator} or pass these spreads manually.
 */
export const loadingIndicatorPresets = {
  /** Full-page / hero blocking loads */
  page: { size: 44, dotSize: 6 },
  /** Large content areas */
  hero: { size: 40, dotSize: 5 },
  /** Default sections, cards */
  section: { size: 36, dotSize: 5 },
  /** Lists, modals */
  inline: { size: 28, dotSize: 4 },
  /** Tight rows */
  compact: { size: 22, dotSize: 3 },
  /** Chakra `Button` `spinner` slot — paired with {@link ButtonLoadingSpinner} */
  button: { size: 18, dotSize: 3 },
  /** Header search, micro UI */
  micro: { size: 14, dotSize: 2 },
} as const;

export type LoadingIndicatorVariant = keyof typeof loadingIndicatorPresets;

type LoadingIndicatorProps = {
  variant?: LoadingIndicatorVariant;
  /** Chakra color token (e.g. `blue.400`) — wraps loader in `Box` with `color`. */
  chakraColor?: string;
} & Omit<ComponentProps<typeof DotmTriangle20>, "size" | "dotSize" | "color">;

/**
 * App-standard loader: dot-matrix triangle with consistent sizes.
 */
export function LoadingIndicator({
  variant = "section",
  chakraColor,
  ...rest
}: LoadingIndicatorProps) {
  const preset =
    loadingIndicatorPresets[variant] ?? loadingIndicatorPresets.section;
  const dot = (
    <DotmTriangle20 color="currentColor" {...preset} {...rest} />
  );
  if (chakraColor) {
    return (
      <Box as="span" display="inline-flex" alignItems="center" color={chakraColor}>
        {dot}
      </Box>
    );
  }
  return dot;
}

/**
 * Chakra `Button` loading spinner replacement. Pass as `spinner={<ButtonLoadingSpinner />}`.
 */
export function ButtonLoadingSpinner() {
  const { size, dotSize } = loadingIndicatorPresets.button;
  return (
    <DotmTriangle20
      silent
      color="currentColor"
      size={size}
      dotSize={dotSize}
      ariaLabel="Loading"
    />
  );
}
