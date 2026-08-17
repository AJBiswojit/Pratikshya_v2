import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AtelierButton, Rule } from "../../design-system";

/**
 * The Atelier confirmation dialog.
 *
 * A modal dialog in the accessible sense: labelled by its own heading and
 * description, focus moved in on open and returned to the trigger on
 * close, Escape dismisses, and Tab is held inside while it is open. Used
 * for the deliberate, irreversible movements — cancelling an order.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Keep",
  onConfirm,
  onCancel,
  tone = "primary",
}) {
  const panelRef = useRef(null);
  const confirmRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    returnFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    confirmRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, onCancel]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md border border-mist bg-canvas p-7 shadow-xl sm:p-9"
      >
        <h2
          id={titleId}
          className="font-display text-2xl font-light tracking-tight text-ink"
        >
          {title}
        </h2>
        <Rule width="w-10" tone="accent" className="mt-3 mb-5" />
        <p
          id={descriptionId}
          className="font-ui text-sm leading-relaxed text-graphite"
        >
          {description}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <AtelierButton
            ref={confirmRef}
            type="button"
            variant={tone === "primary" ? "primary" : "outline"}
            size="chip"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AtelierButton>
          <AtelierButton
            type="button"
            variant="outline"
            size="chip"
            onClick={onCancel}
          >
            {cancelLabel}
          </AtelierButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
