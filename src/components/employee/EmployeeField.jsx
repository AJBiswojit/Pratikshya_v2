import { useId } from "react";
import { cn } from "../../utils/cn";

export const employeeInputClass = (hasError = false) =>
  cn(
    "w-full border bg-canvas px-3.5 py-2.5 font-ui text-sm text-ink transition-colors focus:outline-none focus:ring-1",
    hasError
      ? "border-accent focus:border-accent focus:ring-accent"
      : "border-pearl focus:border-ink focus:ring-ink"
  );

export default function EmployeeField({
  label,
  required = false,
  optional = false,
  error = "",
  hint = "",
  id,
  className = "",
  children,
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">
          {label}
          {required ? <span className="text-accent"> *</span> : null}
        </label>
        {optional ? (
          <span className="font-ui text-[10px] lowercase tracking-normal text-taupe">optional</span>
        ) : null}
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
