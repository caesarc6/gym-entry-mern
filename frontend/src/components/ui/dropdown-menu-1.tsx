import { Link } from "react-router-dom";
import {
  FaUser,
  FaBell,
  FaLock,
  FaSignOutAlt,
  FaCog,
  FaChartLine,
  FaUsers,
} from "react-icons/fa";
import { MdArrowDropDown } from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeSelector from "@/components/ThemeSelector";
import { cn } from "@/lib/utils";

/** Unified menu typography (matches DropdownMenuItem rows inside this panel). */
const USER_MENU_PANEL_TEXT =
  "font-sans text-sm font-light leading-snug antialiased";

export type HeroDesktopUserDropdownProps = {
  userName: string;
  isLightTheme: boolean;
  hasTrainerDashboardAccess: boolean;
  onSignOut: () => void | Promise<void>;
  onThemeChange?: () => void;
};

export function HeroDesktopUserDropdown({
  userName,
  isLightTheme,
  hasTrainerDashboardAccess,
  onSignOut,
  onThemeChange,
}: HeroDesktopUserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center justify-center gap-0.5 px-2 font-light data-[state=open]:[&_.hero-nav-user-chevron]:rotate-180",
            isLightTheme
              ? "text-zinc-900 hover:bg-zinc-100"
              : "text-zinc-100 hover:bg-white/10",
          )}
        >
          <span
            className={cn(
              USER_MENU_PANEL_TEXT,
              isLightTheme ? "text-zinc-500" : "text-zinc-400",
            )}
          >
            @{userName}
          </span>
          <MdArrowDropDown
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
          "w-60 space-y-1 text-popover-foreground sm:w-64",
          USER_MENU_PANEL_TEXT,
        )}
        align="center"
        sideOffset={6}
      >
        <div className={cn("px-2", USER_MENU_PANEL_TEXT)}>
          <p className="text-popover-foreground">Account</p>
          <p className="text-muted-foreground">
            Profile, notifications, and app settings
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="rounded-md">
          <Link
            to="/profile"
            className={cn(
              USER_MENU_PANEL_TEXT,
              "flex cursor-default items-center gap-2 text-popover-foreground",
            )}
          >
            <FaUser className="size-4 shrink-0" aria-hidden />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-md">
          <Link
            to="/notifications"
            className={cn(
              USER_MENU_PANEL_TEXT,
              "flex cursor-default items-center gap-2 text-popover-foreground",
            )}
          >
            <FaBell className="size-4 shrink-0" aria-hidden />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-md">
          <Link
            to="/analytics"
            className={cn(
              USER_MENU_PANEL_TEXT,
              "flex cursor-default items-center gap-2 text-popover-foreground",
            )}
          >
            <FaChartLine className="size-4 shrink-0" aria-hidden />
            <span>Analytics</span>
          </Link>
        </DropdownMenuItem>

        {hasTrainerDashboardAccess && (
          <DropdownMenuItem asChild className="rounded-md">
            <Link
              to="/trainer/dashboard"
              className={cn(
                USER_MENU_PANEL_TEXT,
                "flex cursor-default items-center gap-2 text-popover-foreground",
              )}
            >
              <FaUsers className="size-4 shrink-0" aria-hidden />
              <span>Trainer dashboard</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="rounded-md">
          <Link
            to="/settings"
            className={cn(
              USER_MENU_PANEL_TEXT,
              "flex cursor-default items-center gap-2 text-popover-foreground",
            )}
          >
            <FaLock className="size-4 shrink-0" aria-hidden />
            <span>Privacy & settings</span>
          </Link>
        </DropdownMenuItem>

        <div className={cn("px-2 pb-1 pt-1.5", USER_MENU_PANEL_TEXT)}>
          <p className="mb-1.5 flex items-center gap-2 text-popover-foreground">
            <FaCog className="size-4 shrink-0" aria-hidden />
            <span>Appearance</span>
          </p>
          <ThemeSelector
            onThemeChange={onThemeChange}
            uiShellTypography
            className="justify-start gap-2 text-popover-foreground"
          />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={cn(
            USER_MENU_PANEL_TEXT,
            "rounded-md text-destructive transition-[color,background-color] duration-150 ease-out focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive",
          )}
          onSelect={() => {
            void onSignOut();
          }}
        >
          <FaSignOutAlt className="size-4 shrink-0" aria-hidden />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
