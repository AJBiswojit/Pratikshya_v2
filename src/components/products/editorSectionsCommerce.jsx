/**
 * PRATIKSHYA FASHON — Product editor sections: Pricing and Variants
 * (Phase 13). All arithmetic comes from the shared pricing engine; this
 * file only renders it.
 */

import { Plus, Trash2 } from "lucide-react";
import {
  COLOR_OPTIONS,
  GST_RATES,
  SIZE_OPTIONS,
  TAX_MODE_OPTIONS,
  VARIANT_STATUSES,
} from "../../config/productCatalogConfig";
import { DISCOUNT_TYPE_OPTIONS, computePricing, resolveVariantPrice } from "../../utils/pricing";
import { formatINR } from "../../utils/shopping";
import catalogRepository from "../../services/catalogRepository";
import { cn } from "../../utils/cn";
import { Field, NumberInput, Select, TextInput } from "./editorFields";

/* ------------------------------------------------------------------ */
/* 3 · Pricing                                                         */
/* ------------------------------------------------------------------ */

export function SectionPricing({ draft, patch }) {
  const pricing = draft.pricing;
  const computed = computePricing(pricing);
  const setPricing = (partial) => patch({ pricing: { ...pricing, ...partial } });
  const isCustomRate = pricing.customTaxRate;

  return (
    <div className="space-y-8">
      {/* Input controls */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="MRP (₹)"
          required
          hint="List price — the struck-through figure."
          htmlFor="pf-mrp"
        >
          <NumberInput
            id="pf-mrp"
            min="0"
            step="1"
            value={pricing.mrp}
            onChange={(event) => setPricing({ mrp: event.target.value })}
            placeholder="8999"
          />
        </Field>

        <Field
          label="Selling price (₹)"
          required
          hint="The house price. Cannot exceed MRP."
          htmlFor="pf-selling"
        >
          <NumberInput
            id="pf-selling"
            min="0"
            step="1"
            value={pricing.sellingPrice}
            onChange={(event) => setPricing({ sellingPrice: event.target.value })}
            placeholder="7499"
          />
        </Field>

        <Field label="Discount type" htmlFor="pf-discount-type">
          <Select
            id="pf-discount-type"
            value={pricing.discountType}
            onChange={(event) => setPricing({ discountType: event.target.value })}
            options={DISCOUNT_TYPE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
          />
        </Field>

        {pricing.discountType !== "none" ? (
          <Field
            label={pricing.discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
            hint={pricing.discountType === "percentage" ? "0–100." : "Cannot exceed the selling price."}
            htmlFor="pf-discount-value"
          >
            <NumberInput
              id="pf-discount-value"
              min="0"
              step={pricing.discountType === "percentage" ? "0.5" : "1"}
              value={pricing.discountValue}
              onChange={(event) => setPricing({ discountValue: event.target.value })}
              placeholder={pricing.discountType === "percentage" ? "10" : "500"}
            />
          </Field>
        ) : null}
      </div>

      {/* Visible Pricing Summary & Calculation Matrix */}
      <div
        aria-live="polite"
        className="border border-mist bg-canvas p-5 sm:p-6"
      >
        <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">
          Pricing Calculation Summary
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="border-l border-mist/80 pl-3">
            <p className="font-ui text-[10px] uppercase tracking-wider text-taupe">MRP</p>
            <p className="mt-1 font-display text-lg text-ink">
              {computed.mrp > 0 ? formatINR(computed.mrp) : "—"}
            </p>
          </div>
          <div className="border-l border-mist/80 pl-3">
            <p className="font-ui text-[10px] uppercase tracking-wider text-taupe">Selling Price</p>
            <p className="mt-1 font-display text-lg text-ink">
              {computed.sellingPrice > 0 ? formatINR(computed.sellingPrice) : "—"}
            </p>
          </div>
          <div className="border-l border-mist/80 pl-3">
            <p className="font-ui text-[10px] uppercase tracking-wider text-taupe">Discount</p>
            <p className="mt-1 font-display text-lg text-ink">
              {pricing.discountType === "percentage" && pricing.discountValue > 0
                ? `${pricing.discountValue}%`
                : pricing.discountType === "fixed" && pricing.discountValue > 0
                  ? formatINR(pricing.discountValue)
                  : computed.effectiveDiscountPercent > 0
                    ? `${computed.effectiveDiscountPercent}%`
                    : "0%"}
            </p>
          </div>
          <div className="border-l border-mist/80 pl-3">
            <p className="font-ui text-[10px] uppercase tracking-wider text-taupe">GST Rate</p>
            <p className="mt-1 font-display text-lg text-ink">{pricing.taxRate ?? 0}%</p>
          </div>
          <div className="border-l border-mist/80 pl-3">
            <p className="font-ui text-[10px] uppercase tracking-wider text-taupe">Tax Mode</p>
            <p className="mt-1 font-display text-lg text-ink">
              {pricing.taxMode === "EXCLUSIVE" ? "Exclusive" : "Inclusive"}
            </p>
          </div>
          <div className="border-l-2 border-ink pl-3 bg-surface/30 p-2">
            <p className="font-ui text-[10px] uppercase tracking-wider text-ink font-semibold">Final Price</p>
            <p className="mt-1 font-display text-xl font-medium text-ink">
              {computed.finalPrice > 0 ? formatINR(computed.finalPrice) : "—"}
            </p>
          </div>
        </div>

        {computed.savings > 0 ? (
          <p className="mt-4 font-ui text-[11px] text-taupe border-t border-mist/60 pt-3">
            Customer saves <span className="font-medium text-ink">{formatINR(computed.savings)}</span> ({computed.effectiveDiscountPercent}% off list MRP)
          </p>
        ) : null}
      </div>

      {/* Real-time Pricing Validation Announcements */}
      {computed.errors.length ? (
        <div
          role="alert"
          className="border border-accent/40 bg-accent/[0.05] p-4"
          aria-label="Pricing validation errors"
        >
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-accent font-semibold">
            Pricing Validation Issues ({computed.errors.length})
          </p>
          <ul className="mt-2 space-y-1">
            {computed.errors.map((error) => (
              <li key={error} className="font-ui text-sm text-accent">
                — {error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tax / GST section */}
      <div className="border-t border-mist/70 pt-6">
        <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">Tax / GST</p>
        <p className="mt-2 max-w-xl font-ui text-[11px] leading-relaxed text-taupe">
          Specify the GST rate and whether customer pricing is tax-inclusive or exclusive.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tax mode" htmlFor="pf-tax-mode">
            <Select
              id="pf-tax-mode"
              value={pricing.taxMode}
              onChange={(event) => setPricing({ taxMode: event.target.value })}
              options={TAX_MODE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
            />
          </Field>

          <Field label="GST rate" htmlFor="pf-tax-rate">
            <Select
              id="pf-tax-rate"
              value={isCustomRate ? "__custom__" : String(pricing.taxRate)}
              onChange={(event) => {
                if (event.target.value === "__custom__") {
                  setPricing({ customTaxRate: true });
                } else {
                  setPricing({ customTaxRate: false, taxRate: Number(event.target.value) });
                }
              }}
              options={[
                ...GST_RATES.map((rate) => ({ value: String(rate), label: `${rate}%` })),
                { value: "__custom__", label: "Custom rate…" },
              ]}
            />
          </Field>

          {isCustomRate ? (
            <Field label="Custom rate (%)" htmlFor="pf-tax-custom">
              <NumberInput
                id="pf-tax-custom"
                min="0"
                max="100"
                step="0.5"
                value={pricing.taxRate}
                onChange={(event) => setPricing({ taxRate: event.target.value })}
                placeholder="18"
              />
            </Field>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Variants                                                        */
/* ------------------------------------------------------------------ */

const emptyVariant = (color = "", size = "") => ({
  id: `var-new-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
  sku: "",
  color: color || "",
  size: size || "",
  priceOverride: "",
  stock: 0,
  barcode: "",
  status: VARIANT_STATUSES.ACTIVE,
});

export function SectionVariants({ draft, patch, errors }) {
  const variants = draft.variants;
  const pricing = computePricing(draft.pricing);

  const setVariant = (id, partial) =>
    patch({ variants: variants.map((variant) => (variant.id === id ? { ...variant, ...partial } : variant)) });

  const removeVariant = (id) => patch({ variants: variants.filter((variant) => variant.id !== id) });

  const variantSkus = variants.map((variant) => variant.sku).filter(Boolean);

  const handleAddVariant = () => {
    const defaultColor = draft.colors?.[0] || draft.primaryColor || "";
    const defaultSize = draft.sizes?.[0] || "Free Size";
    patch({ variants: [...variants, emptyVariant(defaultColor, defaultSize)] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-ui text-sm font-medium text-ink">
            Product Variants ({variants.length})
          </p>
          <p className="mt-1 max-w-xl font-ui text-[11px] leading-relaxed text-taupe">
            Each variant pairs a colour with a size and may carry its own SKU, barcode, price override and status.
            Inactive variants stay stored but are hidden from customers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddVariant}
          className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ivory transition-colors hover:bg-transparent hover:text-ink"
        >
          <Plus size={13} aria-hidden="true" /> Add variant
        </button>
      </div>

      {errors.variants ? (
        <p role="alert" className="border border-accent/40 bg-accent/[0.05] p-3 font-ui text-sm text-accent">
          {errors.variants}
        </p>
      ) : null}

      {!variants.length ? (
        <div className="border border-dashed border-mist/90 bg-canvas px-4 py-12 text-center">
          <p className="font-ui text-sm text-taupe">
            No variants created yet. A product without variants sells in its base colour and size.
          </p>
          <button
            type="button"
            onClick={handleAddVariant}
            className="mt-4 inline-flex items-center gap-2 border border-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
          >
            <Plus size={12} aria-hidden="true" /> Create first variant
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => {
            const duplicateSku =
              variant.sku && variantSkus.filter((sku) => sku === variant.sku).length > 1;
            const clashWithRegister =
              variant.sku && catalogRepository.skuTaken(variant.sku, draft.id);

            const effectivePrice = resolveVariantPrice(variant, draft.pricing);
            const variantSummary = `${variant.color || "No color"} | ${variant.size || "No size"} | ${variant.sku || "No SKU"} | ${formatINR(effectivePrice)} | ${variant.status === VARIANT_STATUSES.ACTIVE ? "Active" : "Inactive"}`;

            return (
              <div key={variant.id} className="border border-mist/80 bg-canvas p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-mist/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-ink px-2 py-0.5 font-ui text-[9px] uppercase tracking-wider text-ivory">
                      #{index + 1}
                    </span>
                    <span className="font-ui text-xs text-ink font-medium">
                      {variantSummary}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove variant ${index + 1}`}
                    onClick={() => removeVariant(variant.id)}
                    className="inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-[.14em] text-taupe transition-colors hover:text-accent"
                  >
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <Field label="Colour">
                    <Select
                      value={variant.color}
                      onChange={(event) => setVariant(variant.id, { color: event.target.value })}
                      placeholder="Choose colour"
                      options={[...new Set([...COLOR_OPTIONS, ...draft.colors, variant.color])]
                        .filter(Boolean)
                        .map((entry) => ({ value: entry, label: entry }))}
                      allowCustom
                    />
                  </Field>

                  <Field label="Size">
                    <Select
                      value={variant.size}
                      onChange={(event) => setVariant(variant.id, { size: event.target.value })}
                      placeholder="Choose size"
                      options={[...new Set([...SIZE_OPTIONS, ...draft.sizes, variant.size])]
                        .filter(Boolean)
                        .map((entry) => ({ value: entry, label: entry }))}
                      allowCustom
                    />
                  </Field>

                  <Field
                    label="Variant SKU"
                    error={duplicateSku || clashWithRegister ? "SKU must be unique." : ""}
                  >
                    <TextInput
                      value={variant.sku}
                      onChange={(event) =>
                        setVariant(variant.id, { sku: event.target.value.toUpperCase() })
                      }
                      placeholder={`${draft.sku || "SKU"}-${index + 1}`}
                    />
                  </Field>

                  <Field label="Price override" hint="Blank uses product price">
                    <NumberInput
                      min="0"
                      step="1"
                      value={variant.priceOverride ?? ""}
                      onChange={(event) =>
                        setVariant(variant.id, {
                          priceOverride: event.target.value === "" ? "" : event.target.value,
                        })
                      }
                      placeholder={String(pricing.finalPrice || "")}
                      aria-label={`Price override for variant ${index + 1}`}
                    />
                  </Field>

                  <Field label="Variant opening stock" hint="Written once on first publication">
                    <NumberInput
                      min="0"
                      step="1"
                      value={variant.stock ?? 0}
                      onChange={(event) => setVariant(variant.id, { stock: event.target.value })}
                      aria-label={`Opening stock for variant ${index + 1}`}
                    />
                  </Field>

                  <Field label="Barcode">
                    <TextInput
                      value={variant.barcode}
                      onChange={(event) => setVariant(variant.id, { barcode: event.target.value })}
                      placeholder="EAN / UPC"
                    />
                  </Field>

                  <Field label="Status">
                    <div className="flex gap-1 pt-0.5" role="radiogroup" aria-label={`Variant ${index + 1} status`}>
                      {[VARIANT_STATUSES.ACTIVE, VARIANT_STATUSES.INACTIVE].map((status) => (
                        <button
                          key={status}
                          type="button"
                          role="radio"
                          aria-checked={variant.status === status}
                          onClick={() => setVariant(variant.id, { status })}
                          className={cn(
                            "flex-1 border px-2.5 py-2 font-ui text-[10px] uppercase tracking-[.14em] transition-colors",
                            variant.status === status
                              ? "border-ink bg-ink text-ivory font-medium"
                              : "border-mist text-taupe hover:border-ink hover:text-ink"
                          )}
                        >
                          {status === VARIANT_STATUSES.ACTIVE ? "Active" : "Inactive"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-2 border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink"
            >
              <Plus size={12} aria-hidden="true" /> Add another variant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
