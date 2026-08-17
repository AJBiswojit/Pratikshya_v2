import { cn } from "../../utils/cn";

/**
 * The short terracotta rule that sits under a headline.
 *
 * It is a decorative hairline, never a semantic separator, so it renders as
 * an empty div rather than an <hr>.
 */

const tones = {
  accent: "bg-accent",
  ink: "bg-ink",
  gold: "bg-gold",
};

export default function Rule({ width = "w-16", tone = "accent", className = "" }) {
  return <div aria-hidden="true" className={cn(width, "h-px", tones[tone], className)} />;
}
