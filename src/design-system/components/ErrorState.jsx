import { cn } from "../../utils/cn";
import { body, display, eyebrow as eyebrowType } from "../typography";
import Rule from "./Rule";

/**
 * The something-broke state.
 *
 * Set exactly like the empty state, because a failure should not look like a
 * different website. Technical detail never reaches the page — the visitor is
 * told the collection is unavailable and offered the way back.
 */
export default function ErrorState({
  eyebrow = "Something Went Wrong",
  title = "The collection is temporarily unavailable",
  description = "Please try again in a moment. If it persists, the atelier is reachable on the contact page.",
  actions = null,
  tone = "canvas",
  className = "",
  ...rest
}) {
  const onInk = tone === "ink";

  return (
    <div
      role="alert"
      className={cn("py-24 md:py-32 text-center flex flex-col items-center", className)}
      {...rest}
    >
      {eyebrow ? (
        <p className={cn(eyebrowType.section, onInk ? "text-gold" : "text-accent", "mb-5")}>
          {eyebrow}
        </p>
      ) : null}

      <h2 className={cn(display.subsection, "max-w-2xl")}>{title}</h2>

      <Rule width="w-16" tone={onInk ? "gold" : "accent"} className="my-8 mx-auto" />

      {description ? (
        <p className={cn(body.base, onInk ? "text-ash" : "text-taupe", "max-w-md")}>
          {description}
        </p>
      ) : null}

      {actions ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">{actions}</div>
      ) : null}
    </div>
  );
}
