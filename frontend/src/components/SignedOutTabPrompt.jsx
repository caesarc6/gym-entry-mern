import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, PlusSquare, User } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

const COPY = {
  create: {
    title: "Sign in to create",
    body: "Log a workout, add photos, and share it with the community.",
    Icon: PlusSquare,
  },
  analytics: {
    title: "Sign in for analytics",
    body: "Track volume, personal records, and trends once you’re signed in.",
    Icon: BarChart3,
  },
  profile: {
    title: "Sign in to view your profile",
    body: "See your posts, followers, and settings on your profile tab.",
    Icon: User,
  },
};

/**
 * Full-tab signed-out state for main shell tabs (native-style: stays on the tab route).
 */
export default function SignedOutTabPrompt({ variant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { title, body, Icon } = COPY[variant] || COPY.profile;

  const returnTo = useMemo(
    () => location.pathname || "/",
    [location.pathname],
  );

  const authState = { from: returnTo };

  return (
    <div
      className={cn(
        "flex min-h-[min(100dvh,100%)] flex-col items-center justify-center px-5",
        "pt-[calc(12px+env(safe-area-inset-top,0px))] pb-8",
      )}
    >
      <Card
        variant="mixed"
        className="w-full max-w-sm border-border/80 bg-card/95 p-8 text-center shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-card/80"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border/60">
          <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>

        <button
          type="button"
          onClick={() => navigate("/signup", { state: authState })}
          className="mt-8 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99]"
        >
          Create account
        </button>

        <button
          type="button"
          onClick={() => navigate("/login", { state: authState })}
          className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Already have an account?
        </button>
      </Card>
    </div>
  );
}
