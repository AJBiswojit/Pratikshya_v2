import { Rule } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * A titled operational panel — the single container used across the Admin
 * dashboard so every section carries the same hairline, heading scale and
 * rhythm.
 */
export default function AdminPanel({
  title,
  eyebrow,
  action = null,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <section className={cn("min-w-0 max-w-full border border-mist/80 bg-surface/40", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-mist/70 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1 font-display text-2xl font-light tracking-tight text-ink">{title}</h2>
          <Rule width="w-8" tone="accent" className="mt-2" />
        </div>
        {action}
      </header>
      <div className={cn("min-w-0 px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}
