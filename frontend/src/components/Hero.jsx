import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Activity, BarChart3, ChevronRight, Rss } from "lucide-react";
import { LiquidBlob } from "@/components/ui/liquid-blob";
import { HERO_OUTLINE_CTA_BUTTON_CLASSNAME } from "../lib/heroCtaButtonClasses";
import { cn } from "../lib/utils";

/** Tailwind palette used by the prior hero blobs: blue-950 / blue-300 */
const HERO_BLOB_PRIMARY = "#172554";
const HERO_BLOB_SECONDARY = "#93c5fd";

const GUEST_PREVIEW = [
  {
    Icon: Activity,
    label: "Log",
    detail: "Capture sets the moment you finish them.",
  },
  {
    Icon: BarChart3,
    label: "Progress",
    detail: "Trends that stay readable week to week.",
  },
  {
    Icon: Rss,
    label: "Feed",
    detail: "Your crew’s sessions in one quiet stream.",
  },
];

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
          <div
            className={cn(
              "relative",
              appGuestMarketing
                ? "flex min-h-[calc(100dvh-5.5rem-env(safe-area-inset-top,0px))] flex-col justify-center pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:pt-10"
                : "min-h-[76vh] pb-36 pt-32 sm:min-h-[82vh] sm:pb-44 sm:pt-36",
            )}
          >
            <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
              <div
                className={cn(
                  "mx-auto text-center",
                  appGuestMarketing ? "max-w-lg" : "mt-6 max-w-md",
                )}
              >
                {appGuestMarketing ? (
                  <p className="font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl">
                    Ethereal Gains
                  </p>
                ) : null}
                <h1
                  className={cn(
                    "text-balance font-serif font-medium text-white",
                    appGuestMarketing
                      ? "mt-4 text-2xl sm:text-3xl"
                      : "text-4xl sm:text-5xl",
                  )}
                >
                  {appGuestMarketing
                    ? "Training, progress, and your crew — after you join."
                    : "Train with clarity. Progress with purpose."}
                </h1>
                <p className="mt-4 text-balance text-zinc-200/95 leading-relaxed">
                  {appGuestMarketing
                    ? "Create an account to log sessions, read honest trends, and follow people you lift with."
                    : "Log workouts, dig into analytics, and stay connected with your crew. Built for momentum without the noise."}
                </p>

                {appGuestMarketing ? (
                  <ul
                    className="mx-auto mt-8 max-w-sm space-y-4 text-left"
                    aria-label="What you get after creating an account"
                  >
                    {GUEST_PREVIEW.map(({ Icon, label, detail }) => (
                      <li key={label} className="flex items-start gap-3">
                        <Icon
                          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-200/90"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span>
                          <span className="block text-sm font-semibold tracking-wide text-white">
                            {label}
                          </span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-zinc-300/95">
                            {detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div
                  className={cn(
                    "mt-6 flex flex-wrap items-center justify-center gap-3",
                    appGuestMarketing && "mt-8 flex-col gap-4",
                  )}
                >
                  <Button asChild className="pr-1.5">
                    <Link to="/signup">
                      <span className="text-nowrap">
                        {appGuestMarketing
                          ? "Create account"
                          : "Start Training Free"}
                      </span>
                      <ChevronRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                  {appGuestMarketing ? (
                    <Link
                      to="/login"
                      className="text-sm text-zinc-300/90 underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      Log in
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
