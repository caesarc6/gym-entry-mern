import type { LucideIcon } from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

import { cn } from "../../lib/utils";

type ToolbarStat = {
  icon: LucideIcon;
  label: string;
};

const toolbarStats: readonly ToolbarStat[] = [
  { icon: HeartIcon, label: "Like" },
  { icon: MessageCircleIcon, label: "Comment" },
] as const;

export type FeedEntryCardProfile = {
  fallback: string;
  /** Bold prefix before workout description (often @handle). */
  captionHandle: string;
  /** Large header line (display name). */
  displayName: string;
  imageAlt: string;
  imageSrc: string;
};

export type FeedEntryCardProps = {
  className?: string;
  profile: FeedEntryCardProfile;
  /** Muted line under the header title (date, workout meta). */
  subtitle: string;
  image: ReactNode;
  liked: boolean;
  onToggleLike: () => void;
  onCommentClick?: () => void;
  likesCount: number;
  commentsCount: number;
  description: string;
  /** Extra icon buttons after Comment (e.g. owner Edit). */
  toolbarExtra?: ReactNode;
  /** Header corner menu (e.g. owner overflow actions). */
  headerTrailing?: ReactNode;
  /** Region below caption (comment composer, etc.). */
  footer?: ReactNode;
  onCardClick?: () => void;
  /** When false, outer card shell does not clip (better touch scroll inside dialogs). */
  clipCardShell?: boolean;
  /** When false, hides like/comment/share/toolbar-extra row (e.g. edit modal). */
  showSocialToolbar?: boolean;
  /** When set, replaces likes line + caption text (editable fields, etc.). */
  captionReplacement?: ReactNode;
};

export function FeedEntryCard({
  className,
  profile,
  subtitle,
  image,
  liked,
  onToggleLike,
  onCommentClick,
  likesCount,
  commentsCount,
  description,
  toolbarExtra,
  headerTrailing,
  footer,
  onCardClick,
  clipCardShell = true,
  showSocialToolbar = true,
  captionReplacement,
}: FeedEntryCardProps) {
  const likesLabel =
    likesCount === 0
      ? ""
      : likesCount === 1
        ? "1 like"
        : `${likesCount.toLocaleString()} likes`;

  const descriptionTrimmed =
    typeof description === "string" ? description.trim() : "";

  return (
    <Card
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      className={cn(
        "border-border/70 bg-background max-w-[min(448px,100%)] w-full min-w-0 rounded-xl border text-left shadow-sm transition-shadow",
        clipCardShell ? "overflow-hidden" : "overflow-visible",
        onCardClick && "cursor-pointer hover:shadow-md",
        !onCardClick && "shadow-lg",
        className,
      )}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (!onCardClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick();
        }
      }}
    >
      <CardContent className="space-y-2 px-0 pb-3 pt-0 text-sm">
        <div className="relative w-full overflow-hidden">
          {image}
          <CardHeader className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-row items-center justify-between gap-3 space-y-0 border-0 bg-transparent px-4 py-3">
            <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="size-9 shrink-0 ring-2 ring-white/25">
                {profile.imageSrc ? (
                  <AvatarImage src={profile.imageSrc} alt={profile.imageAlt} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {profile.fallback}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <CardTitle className="truncate text-sm leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                  {profile.displayName}
                </CardTitle>
                <span className="truncate text-xs leading-snug text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                  {subtitle}
                </span>
              </div>
            </div>
            {headerTrailing ? (
              <div
                className="pointer-events-auto flex shrink-0 items-center"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {headerTrailing}
              </div>
            ) : null}
          </CardHeader>

          {showSocialToolbar ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pt-14">
              {/* Same delay/duration/ease as theme shell so all chrome moves together. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent opacity-100 dark:opacity-0"
                style={{
                  transition:
                    "opacity var(--theme-shell-duration, 0.45s) var(--theme-shell-ease, cubic-bezier(0.42, 0, 0.58, 1)) var(--theme-shell-delay, 0s)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 dark:opacity-100"
                style={{
                  transition:
                    "opacity var(--theme-shell-duration, 0.45s) var(--theme-shell-ease, cubic-bezier(0.42, 0, 0.58, 1)) var(--theme-shell-delay, 0s)",
                }}
              />
              <div
                className="pointer-events-auto relative flex items-center gap-2 px-3 pb-2.5 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-0.5">
                  {toolbarStats.map((stat) => {
                      const Icon = stat.icon;
                      const isLike = stat.label === "Like";
                      const isComment = stat.label === "Comment";

                      return (
                        <Button
                          key={stat.label}
                          variant="ghost"
                          size="icon"
                          type="button"
                          title={
                            isComment && commentsCount > 0
                              ? `${commentsCount} comments`
                              : stat.label
                          }
                          className="size-9 rounded-full text-foreground hover:bg-black/10 hover:text-foreground dark:text-white dark:hover:bg-white/15 dark:hover:text-white"
                          onClick={
                            isLike
                              ? onToggleLike
                              : isComment
                                ? onCommentClick
                                : undefined
                          }
                        >
                          <Icon
                            className={cn(
                              "size-5",
                              isLike &&
                                liked &&
                                "fill-destructive stroke-destructive",
                            )}
                          />
                          <span className="sr-only">{stat.label}</span>
                        </Button>
                      );
                    })}
                  {toolbarExtra ? (
                    <span className="flex items-center gap-0.5 [&_button]:text-foreground [&_button]:hover:bg-black/10 dark:[&_button]:text-white dark:[&_button]:hover:bg-white/15">
                      {toolbarExtra}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {captionReplacement || likesLabel || descriptionTrimmed || footer ? (
          <div className="space-y-2.5 px-4">
            {captionReplacement ? (
              captionReplacement
            ) : likesLabel || descriptionTrimmed ? (
              <div className="w-full space-y-2 text-left">
                {descriptionTrimmed ? (
                  <div className="max-h-56 min-h-0 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
                    <p className="text-foreground whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      <span className="mr-1.5 font-semibold">
                        {profile.captionHandle}
                      </span>
                      {description}
                    </p>
                  </div>
                ) : null}
                {likesLabel ? (
                  <p className="text-muted-foreground shrink-0 text-xs font-medium">
                    {likesLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {footer ? (
              <div
                className="border-border/60 border-t pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {footer}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
