import { cn } from "../lib/utils";
import { Card } from "./ui/card";
import { Activity, BarChart3, Users } from "lucide-react";
import { landingDarkRaised } from "../lib/homeLandingDarkTheme";

const previewTile = cn(
  "flex items-center gap-3 rounded-xl border border-slate-300/70 bg-white/80 p-4 shadow-sm",
  "dark:border-[#1e3f5c]/40 dark:bg-gradient-to-br dark:from-[#0b1926] dark:via-[#0f2233] dark:to-[#152a3e]",
);

export default function ProductPreviewSection() {
  return (
    <section className="w-full bg-transparent py-14 sm:py-18">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Product preview
            </p>
            <h2 className="text-balance font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Train smarter, see real progress
            </h2>
            <p className="text-balance text-muted-foreground leading-relaxed">
              Quick logging, clear trends, and a social feed that keeps you
              consistent—without the clutter.
            </p>

            <div className="mt-6 grid gap-3">
              <div className={previewTile}>
                <Activity className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <div>
                  <div className="font-medium text-foreground">
                    Log workouts fast
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Track sets, reps, and weight without slowing down.
                  </div>
                </div>
              </div>
              <div className={previewTile}>
                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <div>
                  <div className="font-medium text-foreground">
                    Analytics that help
                  </div>
                  <div className="text-sm text-muted-foreground">
                    See volume and strength trends over time.
                  </div>
                </div>
              </div>
              <div className={previewTile}>
                <Users className="h-5 w-5 text-primary" strokeWidth={1.75} />
                <div>
                  <div className="font-medium text-foreground">
                    Share with your crew
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Stay accountable with a social training feed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card
            variant="mixed"
            className={cn(
              "relative overflow-hidden p-6 sm:p-8",
              "border border-slate-300/60 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/70",
              landingDarkRaised,
            )}
            aria-label="App preview placeholder"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-[#1e3f5c]/40 dark:bg-[#0b1926]/60">
                <div className="text-sm font-medium text-foreground">
                  Jake — Push Day
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Bench Press
                </div>
                <div className="text-lg font-semibold text-foreground">
                  225 × 5
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Volume up 12% this month
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-[#1e3f5c]/40 dark:bg-[#0b1926]/60">
                <div className="text-sm font-medium text-foreground">
                  Bench Press Trend
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Strength +10.8%
                </div>
                <div className="mt-4 h-20 rounded-xl bg-gradient-to-r from-blue-200/70 via-blue-100 to-slate-100 dark:from-[#0f2233] dark:via-[#152a3e] dark:to-[#0b1926]" />
                <div className="mt-3 text-xs text-muted-foreground">
                  4 weeks
                </div>
              </div>
              <div className="sm:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-[#1e3f5c]/40 dark:bg-[#0b1926]/60">
                <div className="text-sm font-medium text-foreground">
                  Today’s focus
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-muted-foreground dark:bg-white/10">
                    Squat
                    <div className="text-foreground">5×5</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-muted-foreground dark:bg-white/10">
                    Row
                    <div className="text-foreground">4×10</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2 py-2 text-muted-foreground dark:bg-white/10">
                    Core
                    <div className="text-foreground">10 min</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

