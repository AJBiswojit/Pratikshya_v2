import { cn } from "../../utils/cn";
import { badge as badgeType } from "../typography";

/**
 * A small uppercase marker.
 *
 * On the landing page it names a product's edit ("Heritage", "Bridal").
 * Positioning is the caller's job — pass `absolute top-3 left-3` or similar
 * through `className`.
 */

const variants = {
  accent: "bg-accent text-white",
  ink: "bg-ink text-ivory",
  gold: "bg-gold text-ink",
};

export default function AtelierBadge({
  variant = "accent",
  className = "",
  children,
  ...rest
}) {
  return (
    <span
      className={cn(badgeType, "px-2 py-1", variants[variant], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
