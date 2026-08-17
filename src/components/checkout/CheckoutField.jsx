import { useId } from "react";
import { cn } from "../../utils/cn";

/**
 * The house input treatment for checkout fields — the same square hairline
 * style as the Phase 7 address and account forms.
 */
export const fieldInputClass = (hasError = false) =>
  cn(
    "w-full border bg-surface/40 px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
    hasError
      ? "border-accent focus:border-accent focus:ring-accent"
      : "border-pearl focus:border-ink focus:ring-ink"
  );

/**
 * A labelled checkout field with the Atelier micro-label, optional
 * required marker, the styled input and an inline error line wired to
 * ARIA. The input itself is passed as `children` so selects, textareas
 * and formatted inputs all share the same label/error treatment.
 */
export default function CheckoutField({
  label,
  required = false,
  optional = false,
  error = "",
  hint = "",
  id,
  className = "",
  children,
  ...rest
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={className} {...rest}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor={fieldId}
          className="font-ui text-[11px] uppercase tracking-[.18em] text-ink"
        >
          {label}
          {required && <span className="text-accent"> *</span>}
        </label>
        {optional && (
          <span className="font-ui text-[10px] lowercase tracking-normal text-taupe">
            optional
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 font-ui text-[11px] text-accent">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 font-ui text-[11px] text-taupe">{hint}</p>
      ) : null}
    </div>
  );
}
