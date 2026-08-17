import { ArrowLeft, ArrowRight } from "lucide-react";
import { AtelierButton } from "../../design-system";

/**
 * The checkout navigation row — back to the previous step and forward to
 * the next. Forward is always gated by the step's own validation before
 * the page calls it, so a customer can never skip required information.
 */
export default function CheckoutNavigation({
  onBack,
  onPrimary,
  primaryLabel = "Continue",
  backDisabled = false,
  primaryDisabled = false,
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t border-mist/70 pt-6">
      <AtelierButton
        type="button"
        variant="outline"
        size="md"
        onClick={onBack}
        disabled={backDisabled}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back
      </AtelierButton>
      <AtelierButton
        type="button"
        variant="primary"
        size="md"
        onClick={onPrimary}
        disabled={primaryDisabled}
      >
        {primaryLabel} <ArrowRight size={14} aria-hidden="true" />
      </AtelierButton>
    </div>
  );
}
