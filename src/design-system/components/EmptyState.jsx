import { cn } from "../../utils/cn";
import { body, display, eyebrow as eyebrowType } from "../typography";
import Rule from "./Rule";

/**
 * The nothing-here state.
 *
 * A search that returns no pieces is still a page of the house, so it is set
 * like one: eyebrow, display headline, hairline, a line of explanation and
 * the way out. It never says "no results found".
 *
 * `actions` are passed in rather than declared here, because the useful way
 * out differs by page — clearing filters on a listing, browsing a collection
 * from a search.
 */
export default function EmptyState({
  eyebrow = "Nothing Here",
  title = "Not quite the right piece",
  description,
  actions = null,
  tone = "canvas",
  className = "",
  ...rest
}) {
  const onInk = tone === "ink";

  return (
    <div
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
