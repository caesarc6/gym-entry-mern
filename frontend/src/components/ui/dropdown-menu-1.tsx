import { Link } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LineChart,
  Lock,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeSelector from "@/components/ThemeSelector";
import { HEADER_ICON_STROKE } from "@/constants/headerIconStroke.js";
import { cn } from "@/lib/utils";

/** Row typography aligned with hero9-header mobile drawer lists. */
const MENU_ROW_TEXT =
  "font-sans text-xs font-medium leading-snug antialiased tracking-normal";

/**
 * Mirrors `mobileDrawerSurfaceClassName` + `mobileDrawerItemClassName` in hero9-header
 * so the md+ dropdown reads like the slide-out drawer.
 */
function heroNavMenuChrome(appTheme: string) {
  const surface =
    appTheme === "light"
      ? "border-zinc-200 bg-white/90 text-zinc-900 shadow-zinc-900/25 backdrop-blur-xl"
      : appTheme === "dark-blue"
        ? "border-blue-300/10 bg-slate-950/95 text-blue-50 shadow-black/45 backdrop-blur-xl"
        : "border-white/10 bg-zinc-950/95 text-zinc-100 shadow-black/45 backdrop-blur-xl";
  const item =
    appTheme === "light"
      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
      : appTheme === "dark-blue"
        ? "text-blue-100/80 hover:bg-blue-400/10 hover:text-blue-100 data-[highlighted]:bg-blue-400/10 data-[highlighted]:text-blue-100 focus:bg-blue-400/10 focus:text-blue-100"
        : "text-gray-300 hover:bg-white/10 hover:text-blue-300 data-[highlighted]:bg-white/10 data-[highlighted]:text-blue-300 focus:bg-white/10 focus:text-blue-300";

  const sectionLabel =
    appTheme === "light"
      ? "text-current/55"
      : appTheme === "dark-blue"
        ? "text-blue-50/55"
        : "text-current/55";

  return { surface, item, sectionLabel };
}

export type HeroDesktopUserDropdownProps = {
  userName: string;
  /** Resolved app palette (`useThemeColors().currentTheme`); drives drawer-matched chrome. */
  appTheme: string;
  hasTrainerDashboardAccess: boolean;
  onSignOut: () => void | Promise<void>;
  onThemeChange?: () => void;
};

export function HeroDesktopUserDropdown({
  userName,
  appTheme,
  hasTrainerDashboardAccess,
  onSignOut,
  onThemeChange,
}: HeroDesktopUserDropdownProps) {
  const isLightTheme = appTheme === "light";
  const { surface: menuSurfaceClassName, item: menuItemInteractiveClassName, sectionLabel } =
    heroNavMenuChrome(appTheme);

  const itemClassName = cn(
    MENU_ROW_TEXT,
    "cursor-pointer rounded-md px-2 py-1.5 outline-none transition-[color,background-color] duration-150 ease-out [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&_span]:truncate",
    "data-[highlighted]:outline-none focus-visible:outline-none focus:outline-none",
    menuItemInteractiveClassName,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center justify-center gap-0.5 px-2 font-normal data-[state=open]:[&_.hero-nav-user-chevron]:rotate-180",
            isLightTheme
              ? "text-zinc-900 hover:bg-zinc-100"
              : "text-zinc-100 hover:bg-white/10",
          )}
        >
          <span
            className={cn(
              MENU_ROW_TEXT,
              isLightTheme ? "text-zinc-500" : "text-zinc-400",
            )}
          >
            @{userName}
          </span>
          <ChevronDown
            strokeWidth={HEADER_ICON_STROKE}
            className={cn(
              "hero-nav-user-chevron h-5 w-5 shrink-0 transition-transform duration-200 ease-out",
              isLightTheme ? "text-zinc-500" : "text-zinc-400",
            )}
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn(
          MENU_ROW_TEXT,
          "flex w-56 flex-col gap-4 p-4 sm:w-[15.5rem]",
          menuSurfaceClassName,
        )}
        align="center"
        sideOffset={6}
      >
        <span
          className={cn(
            "block text-sm font-medium uppercase tracking-[0.2em]",
            sectionLabel,
          )}
        >
          Account
        </span>

        <div className="flex flex-col gap-3">
          <DropdownMenuItem
            asChild
            className={cn(itemClassName, "justify-start")}
          >
            <Link
              to="/profile"
              className="flex cursor-default items-center gap-2"
            >
              <UserRound
                strokeWidth={HEADER_ICON_STROKE}
                className="size-5 shrink-0"
                aria-hidden
              />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className={cn(itemClassName, "justify-start")}
          >
            <Link
              to="/notifications"
              className="flex cursor-default items-center gap-2"
            >
              <Bell
                strokeWidth={HEADER_ICON_STROKE}
                className="size-5 shrink-0"
                aria-hidden
              />
              <span>Notifications</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className={cn(itemClassName, "justify-start")}
          >
            <Link
              to="/analytics"
              className="flex cursor-default items-center gap-2"
            >
              <LineChart
                strokeWidth={HEADER_ICON_STROKE}
                className="size-5 shrink-0"
                aria-hidden
              />
              <span>Analytics</span>
            </Link>
          </DropdownMenuItem>

          {hasTrainerDashboardAccess && (
            <DropdownMenuItem
              asChild
              className={cn(itemClassName, "justify-start")}
            >
              <Link
                to="/trainer/dashboard"
                className="flex cursor-default items-center gap-2"
              >
                <Users
                  strokeWidth={HEADER_ICON_STROKE}
                  className="size-5 shrink-0"
                  aria-hidden
                />
                <span>Trainer dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            asChild
            className={cn(itemClassName, "justify-start")}
          >
            <Link
              to="/settings"
              className="flex cursor-default items-center gap-2"
            >
              <Lock
                strokeWidth={HEADER_ICON_STROKE}
                className="size-5 shrink-0"
                aria-hidden
              />
              <span>Privacy & settings</span>
            </Link>
          </DropdownMenuItem>

          <Button
            variant="ghost"
            size="sm"
            type="button"
            className={cn(
              "h-auto min-h-8 w-full gap-0 justify-start px-2 py-1.5 font-normal text-inherit shadow-none [&_svg]:pointer-events-none [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0",
              MENU_ROW_TEXT,
              menuItemInteractiveClassName,
            )}
          >
            <ThemeSelector
              onThemeChange={onThemeChange}
              inheritColor
              className="justify-start"
            />
          </Button>

          <DropdownMenuItem
            className={cn(itemClassName, "justify-start gap-2")}
            onSelect={() => {
              void onSignOut();
            }}
          >
            <LogOut
              strokeWidth={HEADER_ICON_STROKE}
              className="size-5 shrink-0"
              aria-hidden
            />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
