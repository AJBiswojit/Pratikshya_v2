import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { AtelierButton, duration, eyebrow, pagePadding, transition } from "../../design-system";
import { cn } from "../../utils/cn";
import FilterPanel from "./FilterPanel";

/**
 * The mobile filter drawer.
 *
 * Slides in from the left — the side the desktop sidebar occupies — so the
 * mental model is the same column arriving rather than a new surface.
 *
 * Filtering applies live, as it does on desktop: the drawer's footer offers
 * "Clear All" and a "Show N pieces" button that simply closes, so the count
 * on it is always the truth about what is already behind it.
 *
 * Focus is moved into the panel on open, held inside it while it is open and
 * returned to the trigger on close.
 */
export default function FilterDrawer({
  open,
  onClose,
  facets,
  filters,
  onToggle,
  onClear,
  activeCount,
  resultCount,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  /* Body scroll lock + Escape, matching the shell's drawer behaviour. */
  useEffect(() => {
    if (!open) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

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

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.page }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: duration.page, ease: "easeOut" }}
        className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-canvas"
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mist/50",
            pagePadding
          )}
        >
          <p className={cn(eyebrow.label, "text-ink")}>
            Filter
            {activeCount > 0 ? <span className="ml-2 text-accent">({activeCount})</span> : null}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className={cn("-mr-2 p-2 text-brass hover:text-accent", transition.colors)}
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto pb-6", pagePadding)}>
          <FilterPanel
            facets={facets}
            filters={filters}
            onToggle={onToggle}
            idPrefix="drawer"
          />
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-3 border-t border-mist/50 py-4",
            pagePadding
          )}
        >
          <AtelierButton
            variant="outline"
            size="md"
            onClick={onClear}
            className="flex-1 justify-center"
          >
            Clear All
          </AtelierButton>
          <AtelierButton
            variant="primary"
            size="md"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            {`Show ${resultCount}`}
          </AtelierButton>
        </div>
      </motion.div>
    </div>
  );
}
