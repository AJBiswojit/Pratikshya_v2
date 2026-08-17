import PratikshyaImage from "../../components/PratikshyaImage";
import { cn } from "../../utils/cn";
import { aspects, imageTreatment, overlays } from "../tokens";
import { zoom as zooms } from "../motion";

/**
 * A cropped image plate.
 *
 * Standardises the four things every piece of imagery on the site shares:
 * a fixed aspect ratio, a clipped frame, `object-cover` sizing and an
 * optional legibility overlay. Captions, badges and controls are passed as
 * children and positioned absolutely against the frame.
 *
 * The image itself is always a `PratikshyaImage`, so manifest lookups, alt
 * text and the fallback chain are preserved.
 *
 * Hover zoom is driven by Tailwind's `group-hover`. Add `group` to whichever
 * element should be the hover target — the frame itself for a standalone
 * tile, or an ancestor when the caption below the image should also trigger
 * the zoom.
 */
export default function MediaFrame({
  as: Tag = "div",
  image,
  hoverImage,
  alt,
  category,
  aspect = "product",
  zoom = null,
  overlay = null,
  surface = false,
  elevated = false,
  imageClassName = "",
  imageProps = {},
  className = "",
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        "relative overflow-hidden",
        aspects[aspect],
        surface && "bg-surface",
        elevated && "shadow-2xl shadow-ink/10",
        className
      )}
      {...rest}
    >
      <PratikshyaImage
        image={image}
        hoverImage={hoverImage}
        alt={alt}
        category={category}
        className={cn(imageTreatment.cover, zoom && zooms[zoom], imageClassName)}
        {...imageProps}
      />
      {overlay ? (
        <div aria-hidden="true" className={cn("absolute inset-0", overlays[overlay])} />
      ) : null}
      {children}
    </Tag>
  );
}
