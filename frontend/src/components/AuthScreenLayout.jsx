import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { cn } from "../lib/utils";

const isNative = getIsCapacitorNative();

/**
 * Shared Login / Sign up shell: centered card column, safe areas, no dock
 * reservation (auth screens are signed-out; glass dock is hidden for guests).
 */
export default function AuthScreenLayout({ children, className }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-md flex-col items-center justify-center px-5",
        "min-h-[100dvh]",
        isNative
          ? "pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
          : "pb-20 pt-[calc(6rem+env(safe-area-inset-top,0px))] md:pt-28",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
