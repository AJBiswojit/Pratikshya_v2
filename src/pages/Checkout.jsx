import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EmptyState,
} from "../design-system";
import { CHECKOUT_STEPS } from "../config/checkoutConfig";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCheckout } from "../context/CheckoutContext";
import { formatINR } from "../utils/shopping";
import CheckoutShell from "../components/checkout/CheckoutShell";
import CheckoutOrderSummary from "../components/checkout/CheckoutOrderSummary";
import CustomerInformation from "../components/checkout/CustomerInformation";
import DeliveryStep from "../components/checkout/DeliveryStep";
import OrderReview from "../components/checkout/OrderReview";
import PaymentStep from "../components/checkout/PaymentStep";

/**
 * Checkout — /checkout.
 *
 * The Phase 8 transaction journey: customer → delivery → review →
 * payment, orchestrated by the checkout context, priced by the Phase 6
 * engine, paid through the clearly-labelled demo payment layer. The bag
 * is the guard rail: an empty bag shows the atelier empty state instead
 * of a form, and the cart is only cleared after a successful payment.
 */
export default function Checkout() {
  const cart = useCart();
  const checkout = useCheckout();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthGate, setShowAuthGate] = useState(false);

  const customerRef = useRef(null);
  const deliveryRef = useRef(null);
  const reviewRef = useRef(null);
  const paymentRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Checkout — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /* A successful demo payment hands off to the order confirmation. */
  useEffect(() => {
    if (checkout.completedOrder) {
      navigate("/order-success", { replace: true });
    }
  }, [checkout.completedOrder, navigate]);

  /* ---------------------------------------------------------------- */

  if (cart.items.length === 0) {
    return (
      <main>
        <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
          <Breadcrumb
            items={[{ label: "Bag", to: "/cart" }, { label: "Checkout" }]}
            className="mb-4"
          />
          <EmptyState
            eyebrow="Checkout"
            title="Your collection is empty."
            description="Add something beautiful before continuing to checkout."
            actions={
              <AtelierButton as={Link} to="/shop" variant="primary" size="md">
                Continue Shopping
              </AtelierButton>
            }
          />
        </AtelierSection>
      </main>
    );
  }

  /* ---------------------------------------------------------------- */

  const stepIndex = checkout.stepIndex;
  const isPaymentStep = stepIndex === CHECKOUT_STEPS.length - 1;

  const handlePrimary = () => {
    if (isPaymentStep) {
      if (!user?.id) {
        setShowAuthGate(true);
        return;
      }
      paymentRef.current?.pay?.();
      return;
    }
    const stepRef = [customerRef, deliveryRef, reviewRef, paymentRef][stepIndex];
    const valid = stepRef.current?.validate?.() ?? true;
    if (valid) checkout.nextStep();
  };

  const primaryLabels = [
    "Continue to Delivery",
    "Continue to Review",
    "Continue to Payment",
    `Pay ${formatINR(checkout.totals.total)}`,
  ];

  const stepPanels = [
    <CustomerInformation key="customer" ref={customerRef} />,
    <DeliveryStep key="delivery" ref={deliveryRef} />,
    <OrderReview key="review" ref={reviewRef} />,
    <PaymentStep key="payment" ref={paymentRef} />,
  ];

  const bagChangedNotice =
    isPaymentStep && checkout.bagChanged ? (
      <div
        role="status"
        className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-accent/30 bg-accent/5 px-5 py-4"
      >
        <p className="flex items-center gap-2.5 font-ui text-[11px] leading-relaxed text-accent">
          <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
          Your bag changed since you reviewed your order — please review it again
          before paying.
        </p>
        <button
          type="button"
          onClick={() => checkout.goToStep(2)}
          className="font-ui text-[10px] uppercase tracking-[.16em] text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          Review Order
        </button>
      </div>
    ) : null;

  return (
    <>
    {showAuthGate && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-5" role="dialog" aria-modal="true" aria-labelledby="order-auth-title">
        <div className="w-full max-w-md border border-mist bg-surface p-8 shadow-xl sm:p-10">
          <p className="font-ui text-[10px] uppercase tracking-[.28em] text-accent">Complete Your Order</p>
          <h2 id="order-auth-title" className="mt-3 font-display text-3xl font-light text-ink">Your journey awaits.</h2>
          <p className="mt-4 font-ui text-sm leading-relaxed text-taupe">Create your PRATIKSHYA account or sign in to securely complete your purchase.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <AtelierButton as={Link} to={`/signin?returnTo=${encodeURIComponent("/checkout")}`} variant="primary" size="md">Sign In</AtelierButton>
            <AtelierButton as={Link} to={`/signup?returnTo=${encodeURIComponent("/checkout")}`} variant="secondary" size="md">Create Account</AtelierButton>
          </div>
          <p className="mt-5 font-ui text-xs text-taupe">Your bag will remain saved while you sign in.</p>
          <button type="button" onClick={() => setShowAuthGate(false)} className="mt-5 font-ui text-[10px] uppercase tracking-[.18em] text-taupe underline">Continue browsing checkout</button>
        </div>
      </div>
    )}
    <CheckoutShell
      stepIndex={stepIndex}
      onStepClick={checkout.goToStep}
      notice={bagChangedNotice}
      summary={<CheckoutOrderSummary />}
      onBack={checkout.backStep}
      onPrimary={handlePrimary}
      primaryLabel={primaryLabels[stepIndex]}
      backDisabled={stepIndex === 0}
      mobilePrimaryLabel={primaryLabels[stepIndex]}
      mobileTotal={formatINR(checkout.totals.total)}
    >
      {stepPanels[stepIndex]}
    </CheckoutShell>
    </>
  );
}
