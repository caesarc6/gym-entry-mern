/**
 * Log composer, laid out like the settings page: a quiet label, a short line, then the field.
 */
import { type MouseEvent, type ReactNode, type RefObject } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ENTRY_POST_MEDIA_ASPECT } from "@/constants/imageAspectRatios";
import { cn } from "@/lib/utils";

export type Card11Props = {
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
  /** Lifts Progress already understood from the description. */
  recognized?: ReadonlyArray<{ name: string; detail: string }>;
};

const Card11 = ({
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
  recognized = [],
}: Card11Props) => {
  return (
    <div className="mx-auto w-full max-w-md space-y-8 text-sm">
      <div className="space-y-2">
        <label
          htmlFor="card11-session-title"
          className="text-sm font-medium text-foreground"
        >
          Title
        </label>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A short name for the session.
        </p>
        <input
          id="card11-session-title"
          type="text"
          autoComplete="off"
          placeholder="Push day"
          value={sessionTitle}
          onChange={(e) => onSessionTitleChange(e.target.value)}
          className="mt-3 h-12 w-full min-w-0 rounded-full border border-border bg-transparent px-4 text-sm font-medium text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-foreground/40"
        />
      </div>

      {imagePreviewSrc ? (
        <div
          ref={imagePreviewRef}
          role="button"
          tabIndex={0}
          className={cn(
            "relative w-full cursor-pointer overflow-hidden rounded-2xl outline-none",
            isImageHighlight && "ring-2 ring-foreground/30",
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

      <div className="space-y-2">
        <label
          htmlFor="card11-description"
          className="text-sm font-medium text-foreground"
        >
          Workout
        </label>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Write the sets the way you would say them.
        </p>
        <textarea
          id="card11-description"
          rows={10}
          placeholder={"Bench press 135lbs - 8 8 6\nDumbbell curls 15lbs - 10 10 10"}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="mt-3 min-h-[12rem] w-full resize-y rounded-2xl border border-border bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/40"
        />
      </div>

      {recognized.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-foreground">Progress will track</p>
          <ul className="mt-3 space-y-2">
            {recognized.map((lift, index) => (
              <li
                key={`${lift.name}-${index}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-foreground">
                  {lift.name}
                </span>
                <span className="shrink-0 text-muted-foreground">{lift.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        {uploadSlot}
        <p className="text-sm leading-relaxed text-muted-foreground">{previewSubtitle}</p>
      </div>
    </div>
  );
};

export default Card11;
