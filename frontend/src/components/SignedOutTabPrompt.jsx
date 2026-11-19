import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, PlusSquare, User } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import {
  authCardClassName,
  authPrimaryButtonClassName,
} from "../lib/authChrome";

const COPY = {
  create: {
    title: "Log a workout",
    body: "Sign in to capture the session and see it on Progress.",
    Icon: PlusSquare,
  },
  analytics: {
    title: "Your progress",
    body: "Sign in to read training trends week to week.",
    Icon: BarChart3,
  },
  profile: {
    title: "Your profile",
    body: "Sign in for workouts, people, and settings.",
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
        "flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 pb-[max(2rem,env(safe-area-inset-bottom))]",
      )}
    >
      <Card
        variant="default"
        className={cn(authCardClassName, "max-w-sm text-center")}
      >
        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border/60 dark:bg-[#0c1b2a] dark:ring-[#1e3f5c]/40">
          <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="font-serif text-xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>

        <button
          type="button"
          onClick={() => navigate("/signup", { state: authState })}
          className={cn(authPrimaryButtonClassName, "mt-10")}
        >
          Create account
        </button>

        <button
          type="button"
          onClick={() => navigate("/login", { state: authState })}
          className="mt-6 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Log in
        </button>
      </Card>
    </div>
  );
}
