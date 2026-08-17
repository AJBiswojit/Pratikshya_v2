import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EditorialHeading,
} from "../../design-system";
import { CHECKOUT_STEPS } from "../../config/checkoutConfig";
import { cn } from "../../utils/cn";
import CheckoutProgress from "./CheckoutProgress";
import CheckoutNavigation from "./CheckoutNavigation";

const STEP_LABELS = ["Customer", "Delivery", "Review", "Payment"];

/**
 * The checkout frame.
 *
 * One calm two-column composition — the steps on the left, the order
 * summary held beside them on desktop and collapsed above them on mobile —
 * with the journey indicator on top, a sticky mobile action bar at the
 * bottom and quiet motion between steps. Nothing about this page should
 * feel like a gateway; it should feel like the rest of the atelier.
 */
export default function CheckoutShell({
  stepIndex,
  onStepClick,
  notice = null,
  children,
  summary,
  onBack,
  onPrimary,
  primaryLabel = "Continue",
  backDisabled = false,
  primaryDisabled = false,
  mobilePrimaryLabel,
  mobileTotal = "",
}) {
  const headingRef = useRef(null);

  /* Each step opening moves focus to its heading for screen readers. */
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [stepIndex]);

  return (
    <main className="pb-24 md:pb-0">
      <AtelierSection rhythm="none" width="wide" className="pb-20 pt-28 sm:pt-32 md:pb-28">
        <Breadcrumb
          items={[{ label: "Bag", to: "/cart" }, { label: "Checkout" }]}
          className="mb-8 md:mb-10"
        />

        <EditorialHeading
          as="h1"
          size="subsection"
          eyebrow="Checkout"
          description="A few quiet steps between your collection and your door."
          spacing={{ eyebrow: "mb-4", title: "mb-8", description: "mb-0" }}
        >
          Complete your <span className="italic text-accent">order.</span>
        </EditorialHeading>

        <CheckoutProgress
          steps={STEP_LABELS}
          currentIndex={stepIndex}
          onStepClick={onStepClick}
          className="mb-10 md:mb-12"
        />

        {notice}

        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Summary — first in the DOM so mobile sees it above the steps. */}
          <div className="lg:order-2 lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-28">{summary}</div>
          </div>

          {/* Steps */}
          <div className="min-w-0 lg:order-1 lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={CHECKOUT_STEPS[stepIndex]}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>

            <CheckoutNavigation
              onBack={onBack}
              onPrimary={onPrimary}
              primaryLabel={primaryLabel}
              backDisabled={backDisabled}
              primaryDisabled={primaryDisabled}
            />
          </div>
        </div>
      </AtelierSection>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-mist/80 bg-canvas/95 px-6 py-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ui text-[9px] uppercase tracking-[.2em] text-taupe">Total</p>
            <p className="truncate font-display text-xl font-light text-ink">{mobileTotal}</p>
          </div>
          <AtelierButton
            type="button"
            variant="primary"
            size="md"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={cn("shrink-0")}
          >
            {mobilePrimaryLabel ?? primaryLabel}
            {stepIndex < CHECKOUT_STEPS.length - 1 && <ArrowRight size={14} aria-hidden="true" />}
          </AtelierButton>
        </div>
      </div>
    </main>
  );
}
