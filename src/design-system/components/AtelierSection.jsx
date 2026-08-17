import { cn } from "../../utils/cn";
import { tones } from "../tokens";
import { container as containerWidths, pagePadding, rhythm } from "../spacing";

/**
 * A page section in the Atelier rhythm.
 *
 * Handles the three things every section on the site shares: vertical
 * rhythm, the page gutter and the centred measure.
 *
 * `contained` decides where the measure lives:
 *   "self"  — the width cap sits on the <section> itself, so the gutter is
 *             subtracted from the capped width. This is how full-canvas
 *             sections are built.
 *   "inner" — the section runs edge to edge (needed whenever it paints a
 *             background) and the measure sits on an inner wrapper.
 *
 * It defaults to "self" on the canvas tone and "inner" on every tone that
 * paints a background, which is exactly how the landing page is composed.
 */
export default function AtelierSection({
  as: Tag = "section",
  tone = "canvas",
  rhythm: rhythmKey = "default",
  width = "wide",
  padded = true,
  contained,
  backdrop = null,
  className = "",
  innerClassName = "",
  children,
  ...rest
}) {
  const placement = contained ?? (tone === "canvas" && !backdrop ? "self" : "inner");
  const measure = containerWidths[width];

  return (
    <Tag
      className={cn(
        rhythm[rhythmKey],
        padded && pagePadding,
        tones[tone],
        placement === "self" && measure,
        className
      )}
      {...rest}
    >
      {backdrop}
      {placement === "inner" ? (
        <div className={cn(measure, innerClassName)}>{children}</div>
      ) : (
        children
      )}
    </Tag>
  );
}
