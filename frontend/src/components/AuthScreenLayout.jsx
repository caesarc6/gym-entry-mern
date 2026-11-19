import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { cn } from "../lib/utils";

const isNative = getIsCapacitorNative();

/**
 * Shared Login / Sign up shell: same rhythm, safe areas, no dock reservation
 * (auth screens are signed-out; glass dock is hidden for guests).
 */
export default function AuthScreenLayout({ children, className }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-md flex-col justify-center px-5",
        "min-h-[100dvh]",
        isNative
          ? "pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]"
          : "pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:pt-28",
        className,
      )}
    >
      {children}
    </div>
  );
}
