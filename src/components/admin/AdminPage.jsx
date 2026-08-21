import { cn } from "../../utils/cn";

/**
 * The standard Admin page frame: eyebrow, editorial headline, supporting
 * line and an optional action cluster. Every admin surface uses it so
 * headings, rhythm and action placement never drift page to page.
 */
export default function AdminPage({
  eyebrow,
  title,
  description,
  actions = null,
  children,
  className = "",
}) {
  return (
    <div className={cn("min-w-0 w-full max-w-full pb-16", className)}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 font-ui text-sm leading-relaxed text-taupe">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
