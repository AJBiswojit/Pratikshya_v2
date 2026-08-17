import { cn } from "../../utils/cn";

/**
 * The Atelier call to action.
 *
 * Square, uppercase, letter-spaced, sans-serif. Colour inverts on hover —
 * there is no lift, no shadow and no radius anywhere in the system.
 *
 * Renders an <a> when `href` is supplied, otherwise a <button>.
 */

const base = "font-ui uppercase transition-all";

const variants = {
  /** Ink on canvas, warming to terracotta. The primary page CTA. */
  primary: "bg-ink text-ivory hover:bg-accent",
  /** Ivory on a coloured band, darkening to ink. */
  inverse: "bg-ivory text-accent hover:bg-ink hover:text-ivory",
  /** Hairline chip that fills with ink on hover. */
  outline:
    "border border-pearl hover:bg-ink hover:text-white hover:border-ink",
  /** Selectable control laid over imagery — pair with the `active` prop. */
  toggle: "bg-white/80 text-ink hover:bg-ink hover:text-white",
};

/** Applied instead of the resting variant style when `active` is true. */
const activeVariants = {
  toggle: "bg-ink text-white",
};

const sizes = {
  /** Standard CTA. */
  md: "inline-flex items-center gap-3 px-8 py-4 text-xs tracking-[0.15em]",
  /** Campaign CTA — wider gutters and looser tracking. */
  lg: "inline-flex items-center gap-3 px-10 py-4 text-xs tracking-[.2em]",
  /** Inline chip in a wrapped row. */
  chip: "px-3 py-1.5 text-[10px] tracking-[.1em]",
  /** Control overlaid on an image tile. */
  micro: "px-3 py-1.5 text-[9px] tracking-[.15em]",
};

export default function AtelierButton({
  as,
  href,
  variant = "primary",
  size = "md",
  active = false,
  className = "",
  children,
  ...rest
}) {
  const Tag = as ?? (href ? "a" : "button");
  const resting = active ? activeVariants[variant] ?? variants[variant] : variants[variant];

  return (
    <Tag
      href={href}
      type={Tag === "button" ? rest.type ?? "button" : undefined}
      aria-pressed={variant === "toggle" && Tag === "button" ? active : undefined}
      {...rest}
      className={cn(base, sizes[size], resting, className)}
    >
      {children}
    </Tag>
  );
}
