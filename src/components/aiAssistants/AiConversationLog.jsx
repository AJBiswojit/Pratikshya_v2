import { forwardRef } from "react";
import { cn } from "../../utils/cn";

/**
 * The scrollable conversation surface shared by both assistants. New
 * assistant messages are announced politely to assistive technology; the
 * ref lets pages keep the newest message in view.
 */
const AiConversationLog = forwardRef(function AiConversationLog(
  { children, className = "", ariaLabel = "Conversation" },
  ref
) {
  return (
    <div
      ref={ref}
      role="log"
      aria-label={ariaLabel}
      aria-live="polite"
      aria-relevant="additions"
      className={cn(
        "flex flex-col gap-5 overflow-y-auto border border-mist/80 bg-canvas/60 p-4 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
});

export default AiConversationLog;

/** One user message, set quietly in ink. */
export function AiUserBubble({ text, at }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[70%]">
        <div className="bg-ink px-4 py-3 font-ui text-sm leading-relaxed text-ivory">{text}</div>
        {at ? (
          <p className="mt-1 text-right font-ui text-[9px] uppercase tracking-[.14em] text-taupe">
            {at} · You
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Assistant identity line used above each AI answer. */
export function AiAssistantMark({ name = "PRATIKSHYA AI", at }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center border border-mist bg-surface font-ui text-[9px] uppercase tracking-[.12em] text-accent">
        AI
      </span>
      <p className="font-ui text-[9px] uppercase tracking-[.2em] text-brass">
        {name}
        {at ? <span className="ml-2 text-taupe">{at}</span> : null}
      </p>
    </div>
  );
}
