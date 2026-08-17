import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Info } from "lucide-react";
import OrderPageShell from "../../components/orders/OrderPageShell";
import OrderNotFound from "../../components/orders/OrderNotFound";
import ReturnSummaryCard from "../../components/orders/ReturnSummaryCard";
import { useOrder } from "../../context/OrderContext";
import {
  AtelierButton,
  EditorialHeading,
  EmptyState,
  Rule,
  transition,
} from "../../design-system";
import {
  RETURN_POLICY_SUMMARY,
  RETURN_REASONS,
  RETURN_RESOLUTIONS,
} from "../../config/orderConfig";
import { returnableItems } from "../../services/orders/returnService";
import {
  canReturnOrder,
  formatOrderDate,
  latestReturn,
  refundAmountFor,
  refundMethodLabel,
  returnBlockedReason,
} from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/**
 * Return request — /account/orders/:orderId/return.
 *
 * A premium, single-purpose form: choose the pieces, say why, say how you
 * would like it resolved. Every rule behind it (eligibility, duplicate
 * protection, validation, refund presentation) lives in the return
 * service, so this page only collects and confirms.
 *
 * Access is ownership-checked through the order context — a return can
 * never be raised against another customer's order.
 */
export default function OrderReturn() {
  const { orderId } = useParams();
  const { orders, getOrderById, createReturn } = useOrder();

  const [selected, setSelected] = useState(() => new Set());
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState("refund");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const confirmationRef = useRef(null);

  const order = useMemo(
    () => getOrderById(orderId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderId, getOrderById, orders]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = order
      ? `Return ${order.id} — PRATIKSHYA FASHON`
      : "Return — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, [order]);

  useEffect(() => {
    if (submitted) confirmationRef.current?.focus();
  }, [submitted]);

  if (!order) return <OrderNotFound />;

  const breadcrumbs = [
    { label: "Account", to: "/account" },
    { label: "Orders", to: "/account/orders" },
    { label: order.id, to: `/account/orders/${order.id}` },
    { label: "Return" },
  ];

  /* ------------------------ Confirmation state ------------------------ */

  if (submitted) {
    return (
      <OrderPageShell breadcrumbItems={breadcrumbs}>
        <div
          ref={confirmationRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-accent" aria-hidden="true" />
            <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
              Return Requested
            </p>
          </div>
          <EditorialHeading
            as="h2"
            size="subsection"
            spacing={{ title: "mb-0" }}
            className="mt-4"
          >
            We have your <span className="italic text-accent">request.</span>
          </EditorialHeading>
          <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-taupe">
            Our care team will review your return and be in touch. You can follow
            its progress here and on your order at any time.
          </p>
        </div>

        <ReturnSummaryCard record={submitted} order={order} className="mt-9" />

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <AtelierButton
            as={Link}
            to={`/account/orders/${order.id}`}
            variant="primary"
            size="md"
          >
            Back to Order
          </AtelierButton>
          <AtelierButton as={Link} to="/shop" variant="outline" size="md">
            Continue Shopping
          </AtelierButton>
        </div>
      </OrderPageShell>
    );
  }

  /* -------------------------- Blocked states -------------------------- */

  const existing = latestReturn(order);

  if (!canReturnOrder(order)) {
    return (
      <OrderPageShell breadcrumbItems={breadcrumbs}>
        {existing ? (
          <>
            <EditorialHeading
              as="h2"
              size="subsection"
              eyebrow="Return Status"
              spacing={{ eyebrow: "mb-3", title: "mb-0" }}
            >
              Your return is <span className="italic text-accent">in motion.</span>
            </EditorialHeading>
            <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-taupe">
              {returnBlockedReason(order)}
            </p>
            <ReturnSummaryCard record={existing} order={order} className="mt-8" />
            <div className="mt-8">
              <AtelierButton
                as={Link}
                to={`/account/orders/${order.id}`}
                variant="primary"
                size="md"
              >
                Back to Order
              </AtelierButton>
            </div>
          </>
        ) : (
          <div className="border border-mist/80 bg-surface/30 px-6">
            <EmptyState
              eyebrow="Return Unavailable"
              title="This order can't be returned"
              description={returnBlockedReason(order)}
              actions={
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <AtelierButton
                    as={Link}
                    to={`/account/orders/${order.id}`}
                    variant="primary"
                    size="md"
                  >
                    Back to Order
                  </AtelierButton>
                  <AtelierButton
                    as={Link}
                    to="/account/orders"
                    variant="outline"
                    size="md"
                  >
                    View My Orders
                  </AtelierButton>
                </div>
              }
            />
          </div>
        )}
      </OrderPageShell>
    );
  }

  /* ------------------------------- Form ------------------------------- */

  const items = returnableItems(order);
  const selectedItems = order.items.filter((item) => selected.has(item.lineId));
  const estimatedRefund = refundAmountFor(selectedItems);

  const toggleItem = (lineId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
    setErrors((current) => ({ ...current, items: "" }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = createReturn({
      orderId: order.id,
      lineIds: [...selected],
      reason,
      resolution,
      note,
    });

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (!result.errors || Object.keys(result.errors).length === 0) {
        setErrors({ form: result.message });
      }
      return;
    }
    setErrors({});
    setSubmitted(result.record);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <OrderPageShell breadcrumbItems={breadcrumbs}>
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow={`Order ${order.id}`}
        description={`Delivered ${formatOrderDate(order.createdAt)} · Tell us what isn't right and we'll take care of it.`}
        spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
      >
        Request a <span className="italic text-accent">return.</span>
      </EditorialHeading>

      <Rule width="w-14" tone="accent" className="my-7" />

      {/* Policy */}
      <p className="flex items-start gap-2.5 border border-mist/80 bg-surface/40 px-5 py-4 font-ui text-[11px] leading-relaxed text-graphite">
        <Info size={14} className="mt-px shrink-0 text-accent" aria-hidden="true" />
        <span>
          {RETURN_POLICY_SUMMARY}{" "}
          <span className="uppercase tracking-[.14em] text-taupe">
            Demo policy language — final terms to be confirmed by the atelier.
          </span>
        </span>
      </p>

      {errorCount > 0 ? (
        <p
          role="alert"
          className="mt-6 border border-accent/40 bg-accent/5 px-5 py-4 font-ui text-[11px] leading-relaxed text-accent"
        >
          {errors.form ??
            "Please complete your return request before submitting it."}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-9">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div className="space-y-10">
            {/* ------------------------- Items ------------------------- */}
            <fieldset>
              <legend className="font-display text-xl font-light tracking-tight text-ink">
                Which pieces are you returning?
              </legend>
              {errors.items ? (
                <p className="mt-2 font-ui text-[11px] text-accent">{errors.items}</p>
              ) : null}

              <ul className="mt-5 space-y-3">
                {items.map((item) => {
                  const disabled = item.alreadyRequested;
                  const checked = selected.has(item.lineId);
                  const inputId = `return-item-${item.lineId}`;

                  return (
                    <li key={item.lineId}>
                      <label
                        htmlFor={inputId}
                        className={cn(
                          "flex cursor-pointer items-center gap-4 border p-4 focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-accent",
                          transition.all,
                          disabled
                            ? "cursor-not-allowed border-mist/70 bg-surface/20 opacity-60"
                            : checked
                              ? "border-accent bg-accent/5"
                              : "border-mist bg-canvas hover:border-accent/60"
                        )}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleItem(item.lineId)}
                          className="h-4 w-4 shrink-0 accent-[#8a3e22]"
                        />
                        <img
                          src={item.image}
                          alt=""
                          className="h-20 w-[3.75rem] shrink-0 bg-surface object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-light text-ink">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                            {[item.color, item.size].filter(Boolean).join(" · ") ||
                              "Free Size"}{" "}
                            · Qty {item.quantity}
                          </span>
                          {disabled ? (
                            <span className="mt-1 block font-ui text-[10px] uppercase tracking-[.14em] text-accent">
                              Already part of a return request
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-ui text-sm text-ink">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            {/* ------------------------- Reason ------------------------- */}
            <fieldset>
              <legend className="font-display text-xl font-light tracking-tight text-ink">
                Why are you returning them?
              </legend>
              {errors.reason ? (
                <p className="mt-2 font-ui text-[11px] text-accent">{errors.reason}</p>
              ) : null}

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {RETURN_REASONS.map((entry) => {
                  const inputId = `return-reason-${entry.id}`;
                  const checked = reason === entry.id;
                  return (
                    <label
                      key={entry.id}
                      htmlFor={inputId}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 border px-4 py-3.5 font-ui text-xs focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-accent",
                        transition.all,
                        checked
                          ? "border-accent bg-accent/5 text-ink"
                          : "border-mist bg-canvas text-graphite hover:border-accent/60"
                      )}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name="return-reason"
                        value={entry.id}
                        checked={checked}
                        onChange={() => {
                          setReason(entry.id);
                          setErrors((current) => ({ ...current, reason: "" }));
                        }}
                        className="h-3.5 w-3.5 shrink-0 accent-[#8a3e22]"
                      />
                      {entry.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* ----------------------- Resolution ----------------------- */}
            <fieldset>
              <legend className="font-display text-xl font-light tracking-tight text-ink">
                How would you like this resolved?
              </legend>
              {errors.resolution ? (
                <p className="mt-2 font-ui text-[11px] text-accent">
                  {errors.resolution}
                </p>
              ) : null}

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {RETURN_RESOLUTIONS.map((entry) => {
                  const inputId = `return-resolution-${entry.id}`;
                  const checked = resolution === entry.id;
                  return (
                    <label
                      key={entry.id}
                      htmlFor={inputId}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 border p-4 focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-accent",
                        transition.all,
                        checked
                          ? "border-accent bg-accent/5"
                          : "border-mist bg-canvas hover:border-accent/60"
                      )}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name="return-resolution"
                        value={entry.id}
                        checked={checked}
                        onChange={() => {
                          setResolution(entry.id);
                          setErrors((current) => ({ ...current, resolution: "" }));
                        }}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#8a3e22]"
                      />
                      <span>
                        <span className="block font-ui text-xs font-medium uppercase tracking-[.14em] text-ink">
                          {entry.label}
                        </span>
                        <span className="mt-1 block font-ui text-[11px] leading-relaxed text-taupe">
                          {entry.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* -------------------------- Note -------------------------- */}
            <div>
              <label
                htmlFor="return-note"
                className="font-display text-xl font-light tracking-tight text-ink"
              >
                Anything you'd like to add?
              </label>
              <p className="mt-2 font-ui text-[11px] text-taupe">
                Optional — a short note helps our care team understand.
              </p>
              <textarea
                id="return-note"
                rows={4}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tell us a little more"
                className="mt-4 w-full resize-y border border-mist bg-canvas px-4 py-3 font-ui text-xs text-ink placeholder:text-taupe focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* --------------------------- Aside --------------------------- */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-mist/80 bg-surface/30 p-6 md:p-7">
              <h3 className="font-display text-xl font-light tracking-tight text-ink">
                Your request
              </h3>
              <Rule width="w-10" tone="accent" className="mt-3 mb-5" />

              <dl className="space-y-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-ui text-[11px] text-graphite">
                    Pieces selected
                  </dt>
                  <dd className="font-ui text-xs text-ink">{selectedItems.length}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-ui text-[11px] text-graphite">Resolution</dt>
                  <dd className="font-ui text-xs text-ink">
                    {RETURN_RESOLUTIONS.find((entry) => entry.id === resolution)
                      ?.label ?? "—"}
                  </dd>
                </div>
                {resolution === "refund" ? (
                  <div className="flex items-baseline justify-between gap-4 border-t border-mist/70 pt-3.5">
                    <dt className="font-ui text-[11px] text-graphite">
                      Estimated refund
                    </dt>
                    <dd className="font-display text-lg font-light text-ink">
                      {formatINR(estimatedRefund)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {resolution === "refund" ? (
                <p className="mt-4 font-ui text-[11px] leading-relaxed text-taupe">
                  {refundMethodLabel(order)}. Demo refund status only — no real
                  payment movement takes place.
                </p>
              ) : null}

              <AtelierButton
                type="submit"
                variant="primary"
                size="md"
                className="mt-7 w-full justify-center"
              >
                Submit Return Request
              </AtelierButton>

              <Link
                to={`/account/orders/${order.id}`}
                className={cn(
                  "mt-5 block text-center font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                  transition.colors
                )}
              >
                Cancel and go back
              </Link>
            </div>
          </aside>
        </div>
      </form>
    </OrderPageShell>
  );
}
