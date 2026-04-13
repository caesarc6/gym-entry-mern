import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { landingDarkRaised } from "../../lib/homeLandingDarkTheme";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  "rounded-xl border text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-card",
        mixed: cn(
          "border-slate-400/55 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300/95 shadow-sm",
          landingDarkRaised
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export { Card, cardVariants };
