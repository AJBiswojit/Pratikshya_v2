import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { eyebrow } from "../typography";
import { transition } from "../motion";

/**
 * The trail above a page title.
 *
 * Set in the same uppercase micro-label as every other eyebrow in the
 * system, separated by the interpunct the brand already uses in captions
 * and the footer bottom bar.
 *
 * `items` is a list of `{ label, to }`. The last item is always the current
 * page and is rendered as plain text with `aria-current`, whether or not it
 * carries a `to`.
 */
export default function Breadcrumb({
  items = [],
  home = { label: "Home", to: "/" },
  separator = "·",
  className = "",
  ...rest
}) {
  const trail = home ? [home, ...items] : items;
  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn(className)} {...rest}>
      <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", eyebrow.label)}>
        {trail.map((item, index) => {
          const isCurrent = index === trail.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {isCurrent || !item.to ? (
                <span className="text-taupe" aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className={cn("text-brass hover:text-accent", transition.colors)}>
                  {item.label}
                </Link>
              )}
              {!isCurrent && (
                <span aria-hidden="true" className="text-mist">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
