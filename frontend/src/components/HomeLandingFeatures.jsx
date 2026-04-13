import {
  Activity,
  BarChart3,
  Dumbbell,
  Rss,
  Share2,
  Shield,
  Users,
} from "lucide-react";

import { Card } from "./ui/card";
import { landingDarkPill } from "../lib/homeLandingDarkTheme";
import { cn } from "../lib/utils";

const pillClass = cn(
  "relative flex h-8 items-center rounded-full border border-slate-400/60 bg-gradient-to-b from-slate-100 to-slate-300/95 px-3 shadow-md shadow-slate-900/10 ring-0 dark:shadow-black/30",
  landingDarkPill,
);

function IconPill({ children, className }) {
  return (
    <div className={cn(pillClass, className)}>
      <span className="text-foreground [&_svg]:size-3.5">{children}</span>
    </div>
  );
}

export function HomeLandingFeatures() {
  return (
    <section
      className="w-full bg-transparent py-16 sm:py-20"
      aria-labelledby="landing-features-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center sm:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            What you get
          </p>
          <h2
            id="landing-features-heading"
            className="mt-3 text-balance font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
          >
            Built for how you actually train
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Log sessions, follow your crew, and see progress—without app
            overload.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 [&>div]:p-6">
          <Card
            variant="mixed"
            className="flex min-h-[280px] flex-col justify-between gap-6 sm:row-span-2"
          >
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">
                One flow for training
              </h3>
              <p className="text-sm text-muted-foreground">
                Workouts, feed, and shared plans stay connected.
              </p>
            </div>
            <div
              aria-hidden
              className="flex h-44 flex-col justify-between pt-4 text-foreground"
            >
              <div className="relative flex h-10 items-center gap-12 px-6">
                <div className="bg-border absolute inset-x-0 my-auto h-px" />
                <IconPill>
                  <Dumbbell strokeWidth={1.75} />
                </IconPill>
                <IconPill>
                  <Rss strokeWidth={1.75} />
                </IconPill>
              </div>
              <div className="relative flex h-10 items-center justify-between gap-12 pl-16 pr-6">
                <div className="bg-border absolute inset-x-0 my-auto h-px" />
                <IconPill>
                  <Users strokeWidth={1.75} />
                </IconPill>
                <IconPill>
                  <Activity strokeWidth={1.75} />
                </IconPill>
              </div>
              <div className="relative flex h-10 items-center gap-20 px-8">
                <div className="bg-border absolute inset-x-0 my-auto h-px" />
                <IconPill>
                  <BarChart3 strokeWidth={1.75} />
                </IconPill>
                <IconPill>
                  <Share2 strokeWidth={1.75} />
                </IconPill>
              </div>
            </div>
          </Card>

          <Card
            variant="mixed"
            className="flex min-h-[280px] flex-col justify-between overflow-hidden sm:row-span-2"
          >
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">
                Progress you can feel
              </h3>
              <p className="text-sm text-muted-foreground">
                Trends and volume come together as you log.
              </p>
            </div>
            <div aria-hidden className="relative h-44 translate-y-6">
              <div className="bg-foreground/15 absolute inset-0 mx-auto w-px" />
              <div className="border-border/70 absolute -inset-x-16 top-6 aspect-square rounded-full border" />
              <div className="border-primary/50 absolute -inset-x-16 top-6 aspect-square rounded-full border bg-primary/5" />
              <div className="border-border/70 absolute -inset-x-8 top-24 aspect-square rounded-full border" />
              <div className="absolute -inset-x-8 top-24 aspect-square rounded-full border border-lime-500/60" />
            </div>
          </Card>

          <Card
            variant="mixed"
            className="flex min-h-[280px] flex-col justify-between overflow-hidden sm:row-span-2"
          >
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Simple by design</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Fewer menus, faster logging—built for the gym floor.
              </p>
            </div>
            <div
              aria-hidden
              className="flex h-44 justify-between pb-6 pt-12"
            >
              {Array.from({ length: 28 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full w-px shrink-0",
                    [4, 9, 14, 19, 24].includes(i)
                      ? "!bg-primary"
                      : "bg-foreground/15"
                  )}
                />
              ))}
            </div>
          </Card>

          <Card
            variant="mixed"
            className="flex min-h-[280px] flex-col items-stretch justify-between gap-4 sm:row-span-2"
          >
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Your crew, your data</h3>
              <p className="text-sm text-muted-foreground">
                Train together with controls that respect privacy.
              </p>
            </div>
            <div className="pointer-events-none relative -ml-7 flex size-44 items-center justify-center self-center pt-2 text-foreground">
              <Shield
                className="absolute inset-0 top-2.5 size-full opacity-15"
                strokeWidth={0.75}
              />
              <Shield className="size-32" strokeWidth={1} />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
