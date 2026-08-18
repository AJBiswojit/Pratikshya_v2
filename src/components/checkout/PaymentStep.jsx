import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  Copy,
  CreditCard,
  Landmark,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useCheckout } from "../../context/CheckoutContext";
import {
  NET_BANKING_BANKS,
  PAYMENT_METHODS,
  UPI_APPS,
} from "../../config/checkoutConfig";
import { PAYMENT_STATUS } from "../../services/payment/paymentService";
import {
  formatCardNumber,
  formatExpiry,
  isValidUpiId,
  validateCardForm,
} from "../../utils/checkout";
import { formatINR } from "../../utils/shopping";
import {
  buildOrderId,
  nextOrderSequence,
} from "../../utils/checkout";
import {
  buildSandboxQrPayload,
  generateSandboxQrSvg,
  serialiseSandboxQrPayload,
} from "../../utils/sandboxQr";
import { AtelierButton } from "../../design-system";
import CheckoutField, { fieldInputClass } from "./CheckoutField";
import { cn } from "../../utils/cn";

const METHOD_ICONS = {
  upi: QrCode,
  card: CreditCard,
  netbanking: Landmark,
  qr: ScanLine,
  cod: Banknote,
};

/* ------------------------------------------------------------------ */
/* Method panels                                                       */
/* ------------------------------------------------------------------ */

function UpiPanel({ form, onChange, errors }) {
  return (
    <div className="space-y-5">
      <CheckoutField
        id="checkout-upi-id"
        label="UPI ID"
        required
        error={errors.id}
        hint="Format: yourname@bank — demo only, nothing is charged."
      >
        <input
          id="checkout-upi-id"
          type="text"
          autoComplete="off"
          inputMode="email"
          value={form.id}
          onChange={(event) => onChange({ id: event.target.value })}
          placeholder="name@upi"
          aria-invalid={Boolean(errors.id)}
          className={fieldInputClass(Boolean(errors.id))}
        />
      </CheckoutField>

      <div>
        <p className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
          Or choose a UPI app
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="UPI app">
          {UPI_APPS.map((app) => {
            const selected = form.app === app;
            return (
              <button
                key={app}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ app: selected ? "" : app })}
                className={cn(
                  "border px-4 py-2 font-ui text-[11px] uppercase tracking-[.12em] transition-colors",
                  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                  selected
                    ? "border-ink bg-ink text-ivory"
                    : "border-pearl bg-surface/40 text-graphite hover:border-ink"
                )}
              >
                {app}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CardPanel({ form, onChange, errors, refs }) {
  return (
    <div className="space-y-5">
      <CheckoutField
        id="checkout-card-number"
        label="Card Number"
        required
        error={errors.number}
      >
        <input
          ref={refs.number}
          id="checkout-card-number"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={form.number}
          onChange={(event) => onChange({ number: formatCardNumber(event.target.value) })}
          placeholder="1234 5678 9012 3456"
          aria-invalid={Boolean(errors.number)}
          className={fieldInputClass(Boolean(errors.number))}
        />
      </CheckoutField>

      <div className="grid gap-5 sm:grid-cols-2">
        <CheckoutField id="checkout-card-expiry" label="Expiry" required error={errors.expiry}>
          <input
            ref={refs.expiry}
            id="checkout-card-expiry"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={form.expiry}
            onChange={(event) => onChange({ expiry: formatExpiry(event.target.value) })}
            placeholder="MM/YY"
            aria-invalid={Boolean(errors.expiry)}
            className={fieldInputClass(Boolean(errors.expiry))}
          />
        </CheckoutField>
        <CheckoutField id="checkout-card-cvv" label="CVV" required error={errors.cvv}>
          <input
            ref={refs.cvv}
            id="checkout-card-cvv"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={form.cvv}
            onChange={(event) => onChange({ cvv: event.target.value.replace(/\D/g, "") })}
            placeholder="•••"
            aria-invalid={Boolean(errors.cvv)}
            className={fieldInputClass(Boolean(errors.cvv))}
          />
        </CheckoutField>
      </div>

      <CheckoutField
        id="checkout-card-name"
        label="Cardholder Name"
        required
        error={errors.name}
      >
        <input
          ref={refs.name}
          id="checkout-card-name"
          type="text"
          autoComplete="off"
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Name as printed on the card"
          aria-invalid={Boolean(errors.name)}
          className={fieldInputClass(Boolean(errors.name))}
        />
      </CheckoutField>

      <p className="flex items-center gap-2 border border-mist/80 bg-surface/30 px-4 py-3 font-ui text-[11px] leading-relaxed text-taupe">
        <ShieldCheck size={14} className="shrink-0 text-accent" aria-hidden="true" />
        Demo form only — card details are validated for format and never stored,
        logged or transmitted.
      </p>
    </div>
  );
}

function NetBankingPanel({ form, onChange, errors }) {
  return (
    <div>
      <p className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
        Choose your bank
      </p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Bank">
        {NET_BANKING_BANKS.map((bank) => {
          const selected = form.bank === bank;
          return (
            <button
              key={bank}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ bank })}
              className={cn(
                "border px-4 py-3 text-left font-ui text-xs transition-colors",
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                selected
                  ? "border-ink bg-ink text-ivory"
                  : "border-pearl bg-surface/40 text-graphite hover:border-ink"
              )}
            >
              {bank}
            </button>
          );
        })}
      </div>
      {errors.bank && (
        <p role="alert" className="mt-3 font-ui text-[11px] text-accent">
          {errors.bank}
        </p>
      )}
      <p className="mt-5 border border-mist/80 bg-surface/30 px-4 py-3 font-ui text-[11px] leading-relaxed text-taupe">
        You will be taken to your bank&rsquo;s sign-in to approve the payment —
        simulated here for the demonstration.
      </p>
    </div>
  );
}

function CodPanel() {
  return (
    <div className="border border-mist/80 bg-surface/30 p-5">
      <p className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">
        Cash on Delivery
      </p>
      <p className="mt-2 font-ui text-xs leading-relaxed text-graphite">
        Pay in cash when your order arrives at your door. A small handling fee
        of {formatINR(49)} is added to this order — it is already reflected in
        the total.
      </p>
      <p className="mt-3 font-ui text-[11px] text-taupe">
        Please keep the exact amount ready for the delivery partner.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sandbox QR panel                                                    */
/* ------------------------------------------------------------------ */

/** Computes the upcoming order id deterministically from the current year
 *  and the document's order sequence. Used to label the QR before the
 *  order has been persisted into order state. The id mirrors `buildOrderId`
 *  / `nextOrderSequence` from `utils/checkout.js`, kept consistent on
 *  purpose. */
function SandboxQrPanel({ onSimulate, paymentStatus, totals, sessionId }) {
  const [svgMarkup, setSvgMarkup] = useState(null);
  const [generationError, setGenerationError] = useState(false);
  const [copied, setCopied] = useState(false);

  // The displayed order id reflects the upcoming reservation that the
  // payment service is going to bind to this session.
  const upcomingReference = useMemo(() => {
    const year = new Date().getFullYear();
    return buildOrderId(year, nextOrderSequence());
  }, []);

  const payload = useMemo(
    () =>
      buildSandboxQrPayload({
        reference: upcomingReference,
        session: sessionId,
        amount: totals?.total ?? 0,
        payment: "qr",
      }),
    [upcomingReference, sessionId, totals?.total]
  );

  useEffect(() => {
    let cancelled = false;
    setGenerationError(false);
    generateSandboxQrSvg(payload, { width: 240 })
      .then((svg) => {
        if (cancelled) return;
        setSvgMarkup(svg);
        if (!svg) setGenerationError(true);
      })
      .catch(() => {
        if (cancelled) return;
        setGenerationError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(serialiseSandboxQrPayload(payload));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may not be available — stay silent.
    }
  };

  const amount = totals?.total ?? 0;
  const amountLabel = formatINR(amount);

  return (
    <div className="border border-mist/80 bg-surface/30 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.22em] text-accent">
          <ScanLine size={12} aria-hidden="true" /> Sandbox QR Payment
        </p>
        <p className="font-ui text-[10px] uppercase tracking-[.22em] text-taupe">
          Test Mode · No Real Charge
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col items-center">
          <div
            className="border border-pearl bg-canvas p-4"
            style={{ minWidth: 248 }}
            aria-live="polite"
          >
            {svgMarkup ? (
              <div
                role="img"
                aria-label={`Sandbox QR code for ${upcomingReference}`}
                className="h-56 w-56 max-w-full [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            ) : generationError ? (
              <p className="grid h-56 w-56 place-items-center font-ui text-[10px] uppercase tracking-[.18em] text-taupe">
                QR Generation Error
              </p>
            ) : (
              <div
                role="status"
                aria-label="Generating sandbox QR code"
                className="grid h-56 w-56 animate-pulse place-items-center bg-surface text-center font-ui text-[9px] uppercase tracking-[.22em] text-taupe"
              >
                Generating QR…
              </div>
            )}
          </div>
          <p className="mt-3 font-ui text-[10px] uppercase tracking-[.22em] text-taupe">
            Scan to Pay
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Order Total
            </p>
            <p className="mt-1 font-display text-3xl font-light tracking-tight text-ink">
              {amountLabel}
            </p>
          </div>

          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Payment Method
            </p>
            <p className="mt-1 font-ui text-sm text-ink">Sandbox QR Payment</p>
          </div>

          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Sandbox Reference
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-sm text-ink">{upcomingReference}</p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Payload copied" : "Copy QR payload"}
                className="inline-flex items-center gap-1 border border-pearl px-2 py-1 font-ui text-[10px] uppercase tracking-[.16em] text-taupe hover:border-ink hover:text-ink"
              >
                <Copy size={11} aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {sessionId ? (
              <p className="mt-1 font-mono text-[10px] text-taupe">
                Session · {sessionId}
              </p>
            ) : null}
          </div>

          <AtelierButton
            type="button"
            variant="primary"
            size="md"
            onClick={onSimulate}
            disabled={paymentStatus === PAYMENT_STATUS.PENDING}
          >
            Simulate Payment
          </AtelierButton>

          <p className="flex items-center gap-2 font-ui text-[10px] leading-relaxed text-taupe">
            <ShieldCheck size={12} className="shrink-0 text-accent" aria-hidden="true" />
            The QR encodes safe sandbox fields only — order id, amount,
            currency and a session reference. No card data, OTP, banking
            credentials or PII is ever embedded.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Payment states                                                      */
/* ------------------------------------------------------------------ */

function PendingPayment() {
  return (
    <div role="status" aria-live="polite" className="border border-mist/80 bg-surface/30 px-6 py-14 text-center">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
        Verifying your payment
      </p>
      <div className="mx-auto mt-8 h-px w-24 animate-pulse bg-accent" aria-hidden="true" />
      <p className="mt-6 font-ui text-xs leading-relaxed text-taupe">
        Please wait — your payment is being confirmed. Do not close this window.
      </p>
    </div>
  );
}

function PaymentOutcome({
  eyebrow,
  headline,
  message,
  actions,
  live = "polite",
}) {
  return (
    <div
      role={live === "assertive" ? "alert" : "status"}
      aria-live={live}
      className="border border-mist/80 bg-surface/30 px-6 py-12 text-center sm:px-10"
    >
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">{eyebrow}</p>
      <h3 className="mx-auto mt-4 max-w-md font-display text-3xl font-light tracking-tight text-ink">
        {headline}
      </h3>
      <p className="mx-auto mt-4 max-w-md font-ui text-xs leading-relaxed text-taupe">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step                                                                */
/* ------------------------------------------------------------------ */

const PaymentStep = forwardRef(function PaymentStep(_props, ref) {
  const cart = useCart();
  const checkout = useCheckout();

  const [methodError, setMethodError] = useState("");
  const [forms, setForms] = useState({
    upi: { id: "", app: "" },
    card: { number: "", expiry: "", cvv: "", name: "" },
    netbanking: { bank: "" },
    cod: {},
  });
  const [errors, setErrors] = useState({});

  const cardRefs = {
    number: useRef(null),
    expiry: useRef(null),
    cvv: useRef(null),
    name: useRef(null),
  };

  const updateForm = (method, fields) => {
    setForms((current) => ({
      ...current,
      [method]: { ...current[method], ...fields },
    }));
    setErrors((current) => ({ ...current, [method]: {} }));
  };

  /** Validates the active method form and starts the demo payment. */
  const handlePay = () => {
    if (!checkout.paymentMethod) {
      setMethodError("Please choose a payment method first.");
      return false;
    }
    setMethodError("");

    const method = checkout.paymentMethod;
    let result = { ok: true, errors: {} };

    if (method === "upi") {
      const id = forms.upi.id.trim();
      result = isValidUpiId(id)
        ? { ok: true, errors: {} }
        : { ok: false, errors: { id: "Please enter a valid UPI ID, like name@bank." } };
    } else if (method === "card") {
      result = validateCardForm(forms.card);
    } else if (method === "netbanking") {
      result = forms.netbanking.bank
        ? { ok: true, errors: {} }
        : { ok: false, errors: { bank: "Please choose a bank to continue." } };
    }

    setErrors((current) => ({ ...current, [method]: result.errors }));
    if (!result.ok) return false;

    checkout.startPayment();
    return true;
  };

  useImperativeHandle(ref, () => ({
    pay: handlePay,
  }));

  const selectedMethod = PAYMENT_METHODS.find((method) => method.id === checkout.paymentMethod);

  /* --------------------------- Payment states --------------------------- */

  if (checkout.paymentStatus === PAYMENT_STATUS.PENDING) {
    return (
      <section aria-labelledby="checkout-step-heading">
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 04</p>
        <h2 id="checkout-step-heading" tabIndex={-1} className="mt-2 font-display text-3xl font-light tracking-tight outline-none">
          Payment <span className="italic text-accent">in progress.</span>
        </h2>
        <div className="mt-9">
          <PendingPayment />
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={checkout.cancelActivePayment}
              className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe underline-offset-2 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              Cancel payment
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (checkout.paymentStatus === PAYMENT_STATUS.FAILURE) {
    return (
      <section aria-labelledby="checkout-step-heading">
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 04</p>
        <h2 id="checkout-step-heading" tabIndex={-1} className="mt-2 font-display text-3xl font-light tracking-tight outline-none">
          Payment <span className="italic text-accent">in progress.</span>
        </h2>
        <div className="mt-9">
          <PaymentOutcome
            live="assertive"
            eyebrow="Payment unsuccessful"
            headline="Payment could not be completed."
            message={checkout.paymentMessage}
            actions={
              <>
                <AtelierButton type="button" variant="primary" size="md" onClick={checkout.retryPayment}>
                  <RotateCcw size={14} aria-hidden="true" /> Try Again
                </AtelierButton>
                <AtelierButton type="button" variant="outline" size="md" onClick={checkout.resetPayment}>
                  Change Payment Method
                </AtelierButton>
                <AtelierButton as={Link} to="/cart" variant="outline" size="md">
                  Return to Bag
                </AtelierButton>
              </>
            }
          />
          <p className="mt-5 text-center font-ui text-[11px] text-taupe">
            Your bag, details and delivery choices are all preserved.
          </p>
        </div>
      </section>
    );
  }

  if (checkout.paymentStatus === PAYMENT_STATUS.CANCELLED) {
    return (
      <section aria-labelledby="checkout-step-heading">
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 04</p>
        <h2 id="checkout-step-heading" tabIndex={-1} className="mt-2 font-display text-3xl font-light tracking-tight outline-none">
          Payment <span className="italic text-accent">in progress.</span>
        </h2>
        <div className="mt-9">
          <PaymentOutcome
            live="assertive"
            eyebrow="Payment cancelled"
            headline="Payment cancelled."
            message={checkout.paymentMessage}
            actions={
              <>
                <AtelierButton type="button" variant="primary" size="md" onClick={checkout.resetPayment}>
                  Return to Payment
                </AtelierButton>
                <AtelierButton type="button" variant="outline" size="md" onClick={checkout.resetPayment}>
                  Change Method
                </AtelierButton>
                <AtelierButton as={Link} to="/cart" variant="outline" size="md">
                  Return to Bag
                </AtelierButton>
              </>
            }
          />
        </div>
      </section>
    );
  }

  /* ------------------------------ Form ------------------------------ */

  return (
    <section aria-labelledby="checkout-step-heading">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 04</p>
      <h2
        id="checkout-step-heading"
        tabIndex={-1}
        className="mt-2 font-display text-3xl font-light tracking-tight outline-none"
      >
        Complete your <span className="italic text-accent">payment.</span>
      </h2>

      <div className="mt-9 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
        {PAYMENT_METHODS.map((method) => {
          const Icon = METHOD_ICONS[method.id];
          const selected = checkout.paymentMethod === method.id;
          return (
            <div key={method.id} className="relative">
              <input
                id={`payment-${method.id}`}
                type="radio"
                name="checkout-payment-method"
                checked={selected}
                onChange={() => checkout.setPaymentMethod(method.id)}
                className="peer sr-only"
              />
              <label
                htmlFor={`payment-${method.id}`}
                className={cn(
                  "flex h-full cursor-pointer items-start gap-3 border bg-surface/20 p-4 transition-colors",
                  "peer-checked:border-ink peer-checked:bg-surface/60",
                  "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-accent",
                  "hover:border-brass"
                )}
              >
                <Icon size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-ui text-[11px] uppercase tracking-[.16em] text-ink">
                    {method.label}
                  </span>
                  <span className="mt-1 block font-ui text-[10px] leading-relaxed text-taupe">
                    {method.description}
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {methodError && (
        <p role="alert" className="mt-4 font-ui text-[11px] text-accent">
          {methodError}
        </p>
      )}

      <div className="mt-8">
        {!selectedMethod ? (
          <p className="border border-dashed border-mist bg-surface/20 px-5 py-8 text-center font-ui text-[11px] uppercase tracking-[.18em] text-taupe">
            Choose a payment method to continue
          </p>
        ) : selectedMethod.id === "upi" ? (
          <UpiPanel form={forms.upi} onChange={(fields) => updateForm("upi", fields)} errors={errors.upi ?? {}} />
        ) : selectedMethod.id === "card" ? (
          <CardPanel form={forms.card} onChange={(fields) => updateForm("card", fields)} errors={errors.card ?? {}} refs={cardRefs} />
        ) : selectedMethod.id === "netbanking" ? (
          <NetBankingPanel form={forms.netbanking} onChange={(fields) => updateForm("netbanking", fields)} errors={errors.netbanking ?? {}} />
        ) : selectedMethod.id === "qr" ? (
          <SandboxQrPanel
            totals={checkout.totals}
            sessionId={checkout.sessionId ?? null}
            paymentStatus={checkout.paymentStatus}
            onSimulate={() => handlePay()}
          />
        ) : (
          <CodPanel />
        )}
      </div>

      {/* --------------------------- Demo controls --------------------------- */}
      <div className="mt-10 border border-mist/80 bg-surface/20 p-5">
        <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.22em] text-accent">
          <AlertCircle size={12} aria-hidden="true" /> Demo / Sandbox Payment
        </p>
        <p className="mt-2 font-ui text-[11px] leading-relaxed text-taupe">
          This is a simulated payment experience for demonstration only — no real
          transaction occurs. Choose the outcome the next attempt should resolve to.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Demo payment scenario">
          {[
            { id: "success", label: "Test Success" },
            { id: "failure", label: "Test Failure" },
            { id: "cancelled", label: "Test Cancellation" },
            { id: "pending", label: "Test Pending" },
          ].map((scenario) => {
            const selected = checkout.demoScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => checkout.setDemoScenario(scenario.id)}
                className={cn(
                  "border px-3 py-1.5 font-ui text-[9px] uppercase tracking-[.14em] transition-colors",
                  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-pearl bg-canvas text-taupe hover:border-accent"
                )}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------ Pay CTA ------------------------------ */}
      <div className="mt-8 border-t border-mist/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Amount payable
            </p>
            <p className="mt-1 font-display text-3xl font-light tracking-tight text-ink">
              {formatINR(checkout.totals.total)}
            </p>
            <p className="mt-1 font-ui text-[10px] text-taupe">
              {cart.count} {cart.count === 1 ? "piece" : "pieces"} · inclusive of all taxes
              {checkout.totals.codFee > 0 && ` · includes ${formatINR(checkout.totals.codFee)} COD fee`}
            </p>
          </div>
          <AtelierButton
            type="button"
            variant="primary"
            size="lg"
            onClick={handlePay}
          >
            Pay {formatINR(checkout.totals.total)}
          </AtelierButton>
        </div>
        <p className="mt-4 flex items-center gap-2 font-ui text-[10px] text-taupe">
          <ShieldCheck size={12} className="text-accent" aria-hidden="true" />
          Secured by the PRATIKSHYA FASHON demo payment layer — no card details leave this page.
        </p>
      </div>
    </section>
  );
});

export default PaymentStep;
