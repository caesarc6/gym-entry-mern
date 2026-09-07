import type { LucideIcon } from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
} from "lucide-react";
import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";

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
  /** Large header line (display name / @handle). */
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
  /** Avatar + display name — open author profile (stop card click). */
  onProfileClick?: () => void;
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
  /** When false, description is not height-clamped (detail modal shows full workout). */
  clampDescription?: boolean;
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
  onProfileClick,
  likesCount,
  commentsCount,
  description,
  toolbarExtra,
  headerTrailing,
  footer,
  onCardClick,
  clipCardShell = true,
  showSocialToolbar = true,
  clampDescription = true,
  captionReplacement,
}: FeedEntryCardProps) {
  const likesLabel =
    likesCount === 0
      ? ""
      : likesCount === 1
        ? "1 like"
        : `${likesCount.toLocaleString()} likes`;

  const commentsLabel =
    commentsCount === 0
      ? ""
      : commentsCount === 1
        ? "1 comment"
        : `${commentsCount.toLocaleString()} comments`;

  const descriptionTrimmed =
    typeof description === "string" ? description.trim() : "";

  const stopCardActivation = (
    e: MouseEvent | PointerEvent | KeyboardEvent,
  ) => {
    e.stopPropagation();
  };

  const isComposerTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, textarea, button, a, select, [contenteditable='true'], [role='menuitem']",
      ),
    );

  return (
    <Card
      className={cn(
        "border-border/70 bg-background max-w-[min(448px,100%)] w-full min-w-0 rounded-xl border text-left shadow-sm transition-shadow",
        clipCardShell ? "overflow-hidden" : "overflow-visible",
        onCardClick && "cursor-pointer hover:shadow-md",
        !onCardClick && "shadow-lg",
        className,
      )}
      onMouseDown={
        onCardClick
          ? (e) => {
              // Never preventDefault on the composer — that blocks focus + the mobile keyboard.
              if (isComposerTarget(e.target)) return;
            }
          : undefined
      }
      onClick={
        onCardClick
          ? (e) => {
              if (isComposerTarget(e.target)) return;
              onCardClick();
            }
          : undefined
      }
    >
      <CardContent className="space-y-2 px-0 pb-3 pt-0 text-sm">
        <div className="relative w-full overflow-hidden">
          {image}
          <CardHeader className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-row items-center justify-between gap-3 space-y-0 border-0 bg-transparent px-4 py-3">
            <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3">
              {onProfileClick ? (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProfileClick();
                  }}
                  aria-label={`View ${profile.displayName}'s profile`}
                >
                  <Avatar className="size-9 shrink-0 ring-2 ring-white/25">
                    {profile.imageSrc ? (
                      <AvatarImage
                        src={profile.imageSrc}
                        alt={profile.imageAlt}
                      />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {profile.fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <CardTitle className="truncate text-sm leading-tight text-white underline-offset-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] hover:underline">
                      {profile.displayName}
                    </CardTitle>
                    <span className="truncate text-xs leading-snug text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                      {subtitle}
                    </span>
                  </div>
                </button>
              ) : (
                <>
                  <Avatar className="size-9 shrink-0 ring-2 ring-white/25">
                    {profile.imageSrc ? (
                      <AvatarImage
                        src={profile.imageSrc}
                        alt={profile.imageAlt}
                      />
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
                </>
              )}
            </div>
            {commentsCount > 0 || headerTrailing ? (
              <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
                {commentsCount > 0 ? (
                  <span
                    className="text-lg leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                    title={commentsLabel}
                    aria-label={commentsLabel}
                  >
                    💬
                  </span>
                ) : null}
                {headerTrailing ? (
                  <div
                    className="flex shrink-0 items-center"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {headerTrailing}
                  </div>
                ) : null}
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
                onMouseDown={stopCardActivation}
                onPointerDown={stopCardActivation}
                onClick={stopCardActivation}
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
                              ? commentsLabel
                              : stat.label
                          }
                          className={cn(
                            "rounded-full text-foreground hover:bg-black/10 hover:text-foreground dark:text-white dark:hover:bg-white/15 dark:hover:text-white",
                            isComment && commentsCount > 0
                              ? "h-9 min-w-9 px-2"
                              : "size-9",
                          )}
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
                              isComment &&
                                commentsCount > 0 &&
                                "fill-foreground/25 dark:fill-white/30",
                            )}
                          />
                          {isComment && commentsCount > 0 ? (
                            <span className="text-xs font-semibold tabular-nums">
                              {commentsCount}
                            </span>
                          ) : (
                            <span className="sr-only">{stat.label}</span>
                          )}
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

        {captionReplacement ||
        likesLabel ||
        commentsLabel ||
        descriptionTrimmed ||
        footer ? (
          <div className="space-y-2.5 px-4">
            {captionReplacement ? (
              captionReplacement
            ) : likesLabel || commentsLabel || descriptionTrimmed ? (
              <div className="w-full space-y-2 text-left">
                {descriptionTrimmed ? (
                  <div
                    className={cn(
                      "mx-auto min-h-0 w-fit max-w-full pr-0.5",
                      clampDescription &&
                        "max-h-56 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
                    )}
                  >
                    <p className="text-foreground whitespace-pre-wrap break-words text-left text-[15px] leading-relaxed">
                      {description}
                    </p>
                  </div>
                ) : null}
                {likesLabel || commentsLabel ? (
                  <p className="text-muted-foreground shrink-0 text-xs font-medium">
                    {[likesLabel, commentsLabel ? `💬 ${commentsLabel}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {footer ? (
              <div
                className="border-border/60 border-t pt-3"
                onMouseDown={stopCardActivation}
                onPointerDown={stopCardActivation}
                onClick={stopCardActivation}
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
