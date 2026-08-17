import { Film, ImageOff } from "lucide-react";
import PratikshyaImage from "../PratikshyaImage";
import { MEDIA_TYPES } from "../../config/mediaTypes";
import { cn } from "../../utils/cn";

/**
 * PRATIKSHYA FASHON — Media thumbnail.
 *
 * One tile shape for every admin surface that lists media: the library, the
 * per-product manager, the marketing board and the detail page.
 *
 * A record can be in three states, and the tile is honest about each:
 *   · an image with an address → the plate, through PratikshyaImage so a
 *     broken address still resolves to house artwork
 *   · a video → its poster, marked with a film glyph (never a live player
 *     in a list — nothing loads a video file until it is asked to)
 *   · a demo placeholder with no address → a labelled hairline panel
 */

/** A media record shaped for `PratikshyaImage`. */
export const mediaImageSource = (media) => {
  const src = media?.type === MEDIA_TYPES.VIDEO ? media?.poster : media?.url || media?.thumbnail;
  if (!src) return null;
  return {
    id: media.id,
    src,
    alt: media.alt || media.title,
    category: media.tags?.[0] ?? "default",
  };
};

export default function MediaThumb({ media, className = "", ratio = "aspect-[4/5]" }) {
  const source = mediaImageSource(media);
  const video = media?.type === MEDIA_TYPES.VIDEO;

  return (
    <div className={cn("relative overflow-hidden bg-canvas-deep", ratio, className)}>
      {source ? (
        <PratikshyaImage
          image={source}
          alt={media.alt || media.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed border-mist bg-surface/40 px-3 text-center">
          {video ? (
            <Film size={18} strokeWidth={1.3} className="text-taupe" aria-hidden="true" />
          ) : (
            <ImageOff size={18} strokeWidth={1.3} className="text-taupe" aria-hidden="true" />
          )}
          <p className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">
            {media?.demoPlaceholder ? "Demo placeholder" : "No preview"}
          </p>
        </div>
      )}

      {video ? (
        <span
          className="absolute left-2 top-2 flex items-center gap-1 bg-ink/80 px-2 py-1 font-ui text-[9px] uppercase tracking-[.14em] text-ivory"
          aria-hidden="true"
        >
          <Film size={11} strokeWidth={1.5} /> Video
        </span>
      ) : null}
    </div>
  );
}
