import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { landingDarkRaised } from "../lib/homeLandingDarkTheme";
import { cn } from "../lib/utils";
import { HomeLandingFeatures } from "./HomeLandingFeatures";

export function HomeLandingSections() {
  return (
    <>
      <HomeLandingFeatures />

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6",
          "pb-20 pt-4 sm:pb-24 sm:pt-6",
        )}
      >
        <section
          className={cn(
            "rounded-2xl border border-slate-400/55 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300/95 p-8 text-center shadow-sm sm:p-10",
            landingDarkRaised,
          )}
          aria-labelledby="landing-cta-heading"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
              aria-hidden
            >
              <UserPlus className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h2
              id="landing-cta-heading"
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
            >
              Start free
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Create an account to log training, explore analytics, and connect
              with people you lift with.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Sign up free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
