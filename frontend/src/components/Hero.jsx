import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";
import { LiquidBlob } from "@/components/ui/liquid-blob";
import { HERO_OUTLINE_CTA_BUTTON_CLASSNAME } from "../lib/heroCtaButtonClasses";
import { cn } from "../lib/utils";

/** Tailwind palette used by the prior hero blobs: blue-950 / blue-300 */
const HERO_BLOB_PRIMARY = "#172554";
const HERO_BLOB_SECONDARY = "#93c5fd";

export const Hero = ({ appGuestMarketing = false }) => {
  const [blobSize, setBlobSize] = useState(420);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBlobSize(w < 640 ? 320 : w < 1024 ? 400 : 480);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      className="relative isolate w-full min-w-0 overflow-hidden bg-[var(--hero-surface-light,#2c3d4c)] dark:bg-[var(--hero-surface-dark,#141c27)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[var(--hero-surface-light,#2c3d4c)] dark:bg-[var(--hero-surface-dark,#141c27)]">
          <LiquidBlob
            className="pointer-events-none"
            interactive={false}
            color={HERO_BLOB_PRIMARY}
            secondaryColor={HERO_BLOB_SECONDARY}
            size={blobSize}
            blur={88}
            opacity={0.55}
            speed={10}
          />
        </div>
      </div>

      <main className="relative z-10 overflow-hidden">
        <section>
          <div className="relative min-h-[76vh] pb-36 pt-32 sm:min-h-[82vh] sm:pb-44 sm:pt-36">
            <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
              <div className="mx-auto mt-6 max-w-md text-center">
                <h1 className="text-balance font-serif text-4xl font-medium text-white sm:text-5xl">
                  {appGuestMarketing
                    ? "Welcome to Ethereal Gains"
                    : "Train with clarity. Progress with purpose."}
                </h1>
                <p className="mt-4 text-balance text-zinc-200/95 leading-relaxed">
                  {appGuestMarketing
                    ? "Log workouts, explore analytics, follow friends, and keep every PR in one place. Here is what you can do once you are in."
                    : "Log workouts, dig into analytics, and stay connected with your crew. Built for momentum without the noise."}
                </p>

                <div
                  className={cn(
                    "mt-6 flex flex-wrap items-center justify-center gap-3",
                    appGuestMarketing && "flex-col gap-4",
                  )}
                >
                  <Button asChild className="pr-1.5">
                    <Link to="/signup">
                      <span className="text-nowrap">
                        {appGuestMarketing ? "Create free account" : "Start Training Free"}
                      </span>
                      <ChevronRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                  {appGuestMarketing ? (
                    <Link
                      to="/login"
                      className="text-sm text-zinc-300/90 underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      Already have an account? Log in
                    </Link>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(HERO_OUTLINE_CTA_BUTTON_CLASSNAME)}
                    >
                      <Link to="/login">
                        <span className="text-nowrap">Log In</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </section>
  );
};
