import { cn } from "../../utils/cn";

/**
 * The italic accent word inside a headline.
 *
 * Every headline in the Atelier language is set in light roman with exactly
 * one word lifted into italic colour. `tone` follows the surface: terracotta
 * on canvas, gold on ink.
 */

const tones = {
  accent: "text-accent",
  gold: "text-gold",
};

export default function Accent({ tone = "accent", className = "", children }) {
  return <span className={cn("italic", tones[tone], className)}>{children}</span>;
}
