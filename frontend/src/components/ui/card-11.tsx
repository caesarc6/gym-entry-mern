/**
 * Watermelon “card-11” layout wired for Create post (props).
 * Registry `shadcn add …/card-11.json` overwrites with a zero-arg demo — restore this file afterward.
 */
import { type MouseEvent, type ReactNode, type RefObject } from "react";
import { XIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ENTRY_POST_MEDIA_ASPECT } from "@/constants/imageAspectRatios";
import { cn } from "@/lib/utils";

export type Card11Profile = {
  fallback: string;
  handle: string;
  imageAlt: string;
  imageSrc: string;
  name: string;
};

export type Card11Props = {
  profile: Card11Profile;
  sessionTitle: string;
  onSessionTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  imagePreviewSrc?: string | null;
  imageAlt: string;
  isImageHighlight: boolean;
  imagePreviewRef: RefObject<HTMLDivElement | null>;
  onImagePreviewClick: () => void;
  onRemoveImage: (event: MouseEvent<HTMLButtonElement>) => void;
  uploadSlot: ReactNode;
  previewSubtitle: string;
};

const Card11 = ({
  profile,
  sessionTitle,
  onSessionTitleChange,
  description,
  onDescriptionChange,
  imagePreviewSrc,
  imageAlt,
  isImageHighlight,
  imagePreviewRef,
  onImagePreviewClick,
  onRemoveImage,
  uploadSlot,
  previewSubtitle,
}: Card11Props) => {
  return (
    <Card className="mx-auto max-w-md overflow-hidden rounded-xl border-border/70 bg-background shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-border/60 px-4 py-4">
        <Avatar className="size-9 shrink-0">
          {profile.imageSrc ? (
            <AvatarImage src={profile.imageSrc} alt={profile.imageAlt} />
          ) : null}
          <AvatarFallback className="text-xs">{profile.fallback}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <CardTitle className="truncate text-sm">{profile.name}</CardTitle>
          <p className="truncate text-xs text-muted-foreground">{profile.handle}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-0 pb-4 text-sm">
        <div className="space-y-3 px-4 pt-4">
          <div className="space-y-1.5">
            <label
              htmlFor="card11-session-title"
              className="text-xs font-medium text-muted-foreground"
            >
              Workout title
            </label>
            <input
              id="card11-session-title"
              type="text"
              autoComplete="off"
              placeholder="e.g. Push day"
              value={sessionTitle}
              onChange={(e) => onSessionTitleChange(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/75 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        {imagePreviewSrc ? (
          <div
            ref={imagePreviewRef}
            role="button"
            tabIndex={0}
            className={cn(
              "relative w-full cursor-pointer overflow-hidden outline-none transition-[box-shadow,transform]",
              isImageHighlight
                ? "shadow-[0_10px_30px_rgba(0,0,0,0.25)] ring-2 ring-blue-400 ring-offset-2 ring-offset-background"
                : "shadow-[0_6px_18px_rgba(0,0,0,0.18)]",
            )}
            style={{ aspectRatio: ENTRY_POST_MEDIA_ASPECT }}
            onClick={onImagePreviewClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onImagePreviewClick();
              }
            }}
          >
            <img
              src={imagePreviewSrc}
              alt={imageAlt}
              className="h-full w-full object-cover"
            />
            {isImageHighlight ? (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Remove photo"
                className="absolute right-3 top-3 size-8 rounded-full bg-foreground/80 text-background hover:bg-foreground hover:text-background"
                onClick={onRemoveImage}
              >
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 px-4">
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="card11-description"
              className="text-xs font-medium text-muted-foreground"
            >
              Workout description
            </label>
            <textarea
              id="card11-description"
              rows={10}
              placeholder={`Write your workout…\n\nE.g.\nDumbbell curls 6lbs: 3 sets of 10 reps`}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="min-h-[12rem] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="flex flex-col gap-2">{uploadSlot}</div>

          <p className="text-xs text-muted-foreground">{previewSubtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Card11;
