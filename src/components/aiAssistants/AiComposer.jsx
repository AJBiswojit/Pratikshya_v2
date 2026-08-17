import { useRef } from "react";
import { ArrowUp } from "lucide-react";
import { AtelierButton } from "../../design-system";

/**
 * The question input shared by both assistants. A labelled single-line
 * form: Enter submits, the button is reachable, and focus stays on the
 * field so the conversation keeps its rhythm.
 */
export default function AiComposer({
  value,
  onChange,
  onSubmit,
  busy = false,
  placeholder,
  label,
  submitLabel = "Ask",
  hint = "",
}) {
  const inputRef = useRef(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || !value.trim()) return;
        onSubmit(value.trim());
        inputRef.current?.focus();
      }}
      className="flex items-stretch gap-2 border border-ink/25 bg-ivory p-2 focus-within:border-ink"
    >
      <label htmlFor="ai-composer-input" className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id="ai-composer-input"
        type="text"
        value={value}
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        aria-busy={busy}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent px-2 font-ui text-sm text-ink placeholder:text-taupe/70 focus:outline-none disabled:opacity-60"
      />
      <AtelierButton
        type="submit"
        variant="primary"
        size="chip"
        disabled={busy || !value.trim()}
        className="shrink-0 disabled:cursor-not-allowed disabled:bg-taupe/60"
      >
        {submitLabel} <ArrowUp size={12} aria-hidden="true" />
      </AtelierButton>
      {hint ? <span className="sr-only">{hint}</span> : null}
    </form>
  );
}
