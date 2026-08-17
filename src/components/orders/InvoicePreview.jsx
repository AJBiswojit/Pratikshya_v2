import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AtelierButton, Rule } from "../../design-system";
import { getPaymentStatus } from "../../config/orderConfig";
import { formatOrderDate } from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { formatPhone } from "../../utils/validation";

/**
 * The invoice preview.
 *
 * A frontend document, clearly marked as a demonstration invoice: there is
 * no invoicing service, no tax engine and no PDF pipeline at this stage.
 * "Download" hands the page to the browser's own print-to-PDF, which needs
 * nothing installed and no new dependency.
 *
 * Every figure comes from the order snapshot. No tax line is shown,
 * because the existing business rules do not define one — inventing a tax
 * calculation would be worse than omitting it.
 */
function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-ui text-[11px] text-graphite">{label}</dt>
      <dd
        className={
          strong
            ? "font-display text-lg font-light text-ink"
            : "font-ui text-xs text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default function InvoicePreview({ order, isOpen, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    returnFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
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
  }, [isOpen, onClose]);

  if (!isOpen || !order || typeof document === "undefined") return null;

  const payment = getPaymentStatus(order.paymentStatus);
  const address = order.address;

  return createPortal(
    <div
      data-invoice-overlay
      className="fixed inset-0 z-[70] overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px] sm:p-8"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto my-4 w-full max-w-3xl border border-mist bg-ivory shadow-xl"
      >
        {/* ------------------------- Toolbar ------------------------- */}
        <div className="flex items-center justify-between gap-4 border-b border-mist/80 px-6 py-4 print:hidden">
          <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">
            Invoice Preview · Demo Document
          </p>
          <div className="flex items-center gap-3">
            <AtelierButton
              type="button"
              variant="outline"
              size="chip"
              onClick={() => window.print()}
            >
              Download / Print
            </AtelierButton>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close invoice preview"
              className="p-2 text-taupe transition-colors hover:text-accent"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ------------------------- Document ------------------------- */}
        <div className="px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2
                id={titleId}
                className="font-display text-2xl font-light tracking-[.08em] text-ink"
              >
                PRATIKSHYA FASHON
              </h2>
              <p className="mt-1 font-ui text-[10px] uppercase tracking-[.24em] text-brass">
                Atelier of Handcrafted Indian Couture
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                Invoice
              </p>
              <p className="mt-1 font-display text-lg font-light text-ink">
                {order.invoice.number}
              </p>
              <p className="mt-1 font-ui text-[11px] text-taupe">
                {formatOrderDate(order.invoice.issuedAt)}
              </p>
            </div>
          </div>

          <Rule width="w-full" tone="accent" className="my-7" />

          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                Billed To
              </p>
              <p className="mt-2.5 font-display text-base font-light text-ink">
                {order.customer.fullName}
              </p>
              <p className="font-ui text-xs text-graphite">{order.customer.email}</p>
              {order.customer.phone ? (
                <p className="font-ui text-xs text-graphite">
                  {formatPhone(order.customer.phone)}
                </p>
              ) : null}
            </div>

            {address ? (
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                  Delivered To
                </p>
                <p className="mt-2.5 font-display text-base font-light text-ink">
                  {address.fullName}
                </p>
                <p className="font-ui text-xs leading-relaxed text-graphite">
                  {address.addressLine}
                  {address.landmark ? `, ${address.landmark}` : ""}
                </p>
                <p className="font-ui text-xs text-graphite">
                  {address.city}, {address.state} — {address.pincode}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 border border-mist/80 bg-surface/30 p-5 sm:grid-cols-3">
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                Order ID
              </p>
              <p className="mt-1 font-ui text-sm text-ink">{order.id}</p>
            </div>
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                Order Date
              </p>
              <p className="mt-1 font-ui text-sm text-ink">
                {formatOrderDate(order.createdAt)}
              </p>
            </div>
            <div>
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                Payment
              </p>
              <p className="mt-1 font-ui text-sm text-ink">
                {order.paymentMethod.label} · {payment.label}
              </p>
            </div>
          </div>

          {/* Pieces */}
          <table className="mt-8 w-full border-collapse text-left">
            <caption className="sr-only">
              Pieces billed on invoice {order.invoice.number}
            </caption>
            <thead>
              <tr className="border-b border-ink/20">
                <th
                  scope="col"
                  className="pb-3 font-ui text-[10px] uppercase tracking-[.2em] text-taupe"
                >
                  Piece
                </th>
                <th
                  scope="col"
                  className="pb-3 text-center font-ui text-[10px] uppercase tracking-[.2em] text-taupe"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="pb-3 text-right font-ui text-[10px] uppercase tracking-[.2em] text-taupe"
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.lineId} className="border-b border-mist/70">
                  <td className="py-3.5 pr-4">
                    <p className="font-display text-base font-light text-ink">
                      {item.name}
                    </p>
                    <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                      {[item.color, item.size].filter(Boolean).join(" · ") ||
                        "Free Size"}
                    </p>
                  </td>
                  <td className="py-3.5 text-center font-ui text-xs text-graphite">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 text-right font-ui text-xs text-ink">
                    {formatINR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-7 flex justify-end">
            <dl className="w-full space-y-2.5 sm:max-w-xs">
              <Row label="Subtotal" value={formatINR(order.pricing.subtotal)} />
              {order.pricing.productDiscount > 0 && (
                <Row
                  label="Product discount"
                  value={`− ${formatINR(order.pricing.productDiscount)}`}
                />
              )}
              {order.pricing.couponDiscount > 0 && (
                <Row
                  label={`Offer · ${order.pricing.couponCode ?? "Applied"}`}
                  value={`− ${formatINR(order.pricing.couponDiscount)}`}
                />
              )}
              <Row
                label="Delivery"
                value={
                  order.pricing.shipping === 0
                    ? "Complimentary"
                    : formatINR(order.pricing.shipping)
                }
              />
              {order.pricing.codFee > 0 && (
                <Row
                  label="Cash on delivery fee"
                  value={formatINR(order.pricing.codFee)}
                />
              )}
              <div className="border-t border-ink/20 pt-3">
                <Row label="Total" value={formatINR(order.pricing.total)} strong />
              </div>
            </dl>
          </div>

          <Rule width="w-full" tone="accent" className="my-8" />

          <p className="font-ui text-[10px] uppercase leading-relaxed tracking-[.16em] text-taupe">
            Demonstration invoice — issued by the PRATIKSHYA FASHON frontend for
            client preview. Not a tax invoice and not a record of any real
            transaction.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
