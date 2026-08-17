import { motion } from "framer-motion";

/**
 * The assistant's thinking state: three quiet dots and the current analysis
 * stage. Announced politely to screen readers through the parent log's
 * aria-live region.
 */
export default function AiThinkingIndicator({ stage = "", label = "The assistant is thinking" }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex items-start gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center border border-mist bg-surface font-ui text-[9px] uppercase tracking-[.12em] text-accent">
        AI
      </span>
      <div className="border border-mist/80 bg-surface/50 px-4 py-3">
        <p className="sr-only">{label}</p>
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-taupe"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, delay: dot * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
        {stage ? (
          <p className="mt-2 font-ui text-[11px] uppercase tracking-[.14em] text-taupe">
            {stage}…
          </p>
        ) : null}
      </div>
    </div>
  );
}
