import { cn } from "../../utils/cn";

/**
 * Suggested prompts rendered as quiet, accessible chips. Each chip is a
 * real button that submits the prompt through the same path as the
 * composer, so keyboard and screen-reader users get identical behaviour.
 */
export default function AiQuickPrompts({
  prompts = [],
  onPick,
  disabled = false,
  ariaLabel = "Suggested prompts",
  className = "",
}) {
  if (!prompts.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={ariaLabel}>
      {prompts.map((prompt) => (
        <button
          key={prompt.id ?? prompt.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(prompt.question ?? prompt.label)}
          className="border border-pearl bg-ivory px-3 py-1.5 font-ui text-[11px] tracking-[.04em] text-graphite transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {prompt.label}
        </button>
      ))}
    </div>
  );
}
