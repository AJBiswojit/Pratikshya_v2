/**
 * PRATIKSHYA FASHON — Offer editor (Phase 17).
 *
 * Shared by admin and employee desks. Validation and uniqueness live in
 * the offer repository; this form only collects and previews.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import { AtelierButton } from "../../design-system";
import catalogRepository from "../../services/catalogRepository";
import offerRepository, {
  CUSTOMER_ELIGIBILITY,
  CUSTOMER_ELIGIBILITY_OPTIONS,
  OFFER_STATUS,
  OFFER_TYPES,
  OFFER_TYPE_OPTIONS,
  PRODUCT_ELIGIBILITY,
  PRODUCT_ELIGIBILITY_OPTIONS,
  formatOfferDiscount,
  normalizeCode,
  previewOfferDiscount,
  validateOfferDraft,
} from "../../services/offers/offerRepository";
import { getRegisteredCustomers } from "../../services/employees/operationsService";
import { formatINR } from "../../utils/shopping";
import { categoryLabels } from "../../data/products/taxonomy";
import { cn } from "../../utils/cn";

const emptyDraft = {
  name: "",
  code: "",
  description: "",
  type: OFFER_TYPES.PERCENTAGE,
  discountValue: 10,
  minimumOrderValue: 0,
  maximumDiscount: 0,
  startDate: "",
  endDate: "",
  usageLimit: 0,
  perCustomerLimit: 0,
  customerEligibility: CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS,
  specificCustomerIds: [],
  productEligibility: PRODUCT_ELIGIBILITY.ALL_PRODUCTS,
  includedProducts: [],
  includedCategories: [],
  includedCollections: [],
  excludedProducts: [],
  excludedCategories: [],
  excludedCollections: [],
  stackable: false,
  priority: 0,
  status: OFFER_STATUS.DRAFT,
};

const toggleIn = (list, value) =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

export default function OfferForm({
  offer = null,
  actor = null,
  basePath = "/admin/offers",
}) {
  const navigate = useNavigate();
  const isEdit = Boolean(offer?.id);
  const usageLocked = isEdit && Number(offer.usageCount) > 0;

  const [draft, setDraft] = useState(() =>
    offer
      ? {
          ...emptyDraft,
          ...offer,
          discountValue: offer.discountValue ?? 10,
          status:
            offer.status === OFFER_STATUS.PAUSED || offer.status === OFFER_STATUS.ARCHIVED
              ? offer.status
              : offer.status === OFFER_STATUS.DRAFT
                ? OFFER_STATUS.DRAFT
                : OFFER_STATUS.ACTIVE,
        }
      : emptyDraft
  );
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [sampleAmount, setSampleAmount] = useState(10000);
  const [productQuery, setProductQuery] = useState("");

  const products = useMemo(
    () => catalogRepository.all().filter((product) => product.status === "PUBLISHED"),
    []
  );
  const customers = useMemo(() => getRegisteredCustomers(), []);
  const collections = offerRepository.collections;
  const categories = offerRepository.categories;

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const preview = previewOfferDiscount(draft, sampleAmount);

  const filteredProducts = useMemo(() => {
    const term = productQuery.trim().toLowerCase();
    if (!term) return products.slice(0, 24);
    return products
      .filter((product) =>
        [product.name, product.sku, product.category, categoryLabels[product.category]]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 24);
  }, [products, productQuery]);

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      ...draft,
      code: normalizeCode(draft.code),
      discountValue: Number(draft.discountValue) || 0,
      minimumOrderValue: Number(draft.minimumOrderValue) || 0,
      maximumDiscount: Number(draft.maximumDiscount) || 0,
      usageLimit: Number(draft.usageLimit) || 0,
      perCustomerLimit: Number(draft.perCustomerLimit) || 0,
      priority: Number(draft.priority) || 0,
    };

    const validation = validateOfferDraft(payload, { ignoreId: offer?.id });
    if (!validation.ok) {
      setErrors(validation.errors);
      setNotice("Please complete the highlighted fields.");
      return;
    }

    const result = isEdit
      ? offerRepository.update(offer.id, payload, actor)
      : offerRepository.create(payload, actor);

    if (!result.ok) {
      setErrors(result.errors || {});
      setNotice(result.error || "The offer could not be saved.");
      return;
    }

    navigate(`${basePath}/${result.offer.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      {notice ? (
        <p role="status" className="border border-mist/80 bg-canvas px-4 py-3 font-ui text-sm text-ink">
          {notice}
        </p>
      ) : null}

      <section className="border border-mist/80 bg-surface/40 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-light tracking-tight text-ink">Identity</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <EmployeeField label="Offer name" required error={errors.name}>
            <input
              className={employeeInputClass(Boolean(errors.name))}
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField
            label="Coupon code"
            required
            error={errors.code}
            hint={usageLocked ? "Code is locked after the first redemption." : "Normalised to uppercase."}
          >
            <input
              className={employeeInputClass(Boolean(errors.code))}
              value={draft.code}
              disabled={usageLocked}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              autoComplete="off"
              spellCheck="false"
            />
          </EmployeeField>
          <EmployeeField label="Description" className="md:col-span-2">
            <textarea
              className={employeeInputClass()}
              rows={3}
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </EmployeeField>
        </div>
      </section>

      <section className="border border-mist/80 bg-surface/40 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-light tracking-tight text-ink">Discount</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <EmployeeField label="Discount type" required>
            <select
              className={employeeInputClass()}
              value={draft.type}
              onChange={(event) => setField("type", event.target.value)}
            >
              {OFFER_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </EmployeeField>
          <EmployeeField
            label={draft.type === OFFER_TYPES.FIXED_AMOUNT ? "Amount (₹)" : "Percentage"}
            required
            error={errors.discountValue}
          >
            <input
              type="number"
              min="0"
              max={draft.type === OFFER_TYPES.PERCENTAGE ? 100 : undefined}
              className={employeeInputClass(Boolean(errors.discountValue))}
              value={draft.discountValue}
              onChange={(event) => setField("discountValue", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="Minimum order (₹)" error={errors.minimumOrderValue}>
            <input
              type="number"
              min="0"
              className={employeeInputClass(Boolean(errors.minimumOrderValue))}
              value={draft.minimumOrderValue}
              onChange={(event) => setField("minimumOrderValue", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField
            label="Maximum discount (₹)"
            hint="Leave 0 for no cap."
            error={errors.maximumDiscount}
          >
            <input
              type="number"
              min="0"
              className={employeeInputClass(Boolean(errors.maximumDiscount))}
              value={draft.maximumDiscount}
              onChange={(event) => setField("maximumDiscount", event.target.value)}
            />
          </EmployeeField>
        </div>
      </section>

      <section className="border border-mist/80 bg-surface/40 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-light tracking-tight text-ink">Validity & limits</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <EmployeeField label="Start date">
            <input
              type="date"
              className={employeeInputClass()}
              value={draft.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="End date" error={errors.endDate}>
            <input
              type="date"
              className={employeeInputClass(Boolean(errors.endDate))}
              value={draft.endDate}
              onChange={(event) => setField("endDate", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="Usage limit" hint="0 = unlimited">
            <input
              type="number"
              min="0"
              className={employeeInputClass()}
              value={draft.usageLimit}
              onChange={(event) => setField("usageLimit", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="Per customer limit" hint="0 = unlimited">
            <input
              type="number"
              min="0"
              className={employeeInputClass()}
              value={draft.perCustomerLimit}
              onChange={(event) => setField("perCustomerLimit", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="Priority" hint="Higher wins when several apply.">
            <input
              type="number"
              min="0"
              className={employeeInputClass()}
              value={draft.priority}
              onChange={(event) => setField("priority", event.target.value)}
            />
          </EmployeeField>
          <EmployeeField label="Status">
            <select
              className={employeeInputClass()}
              value={draft.status}
              onChange={(event) => setField("status", event.target.value)}
            >
              <option value={OFFER_STATUS.DRAFT}>Draft</option>
              <option value={OFFER_STATUS.ACTIVE}>Active / scheduled</option>
              <option value={OFFER_STATUS.PAUSED}>Paused</option>
              {isEdit ? <option value={OFFER_STATUS.ARCHIVED}>Archived</option> : null}
            </select>
          </EmployeeField>
          <label className="flex items-center gap-3 font-ui text-sm text-ink md:col-span-2">
            <input
              type="checkbox"
              checked={draft.stackable}
              onChange={(event) => setField("stackable", event.target.checked)}
            />
            Stackable with another offer
            <span className="text-[11px] text-taupe">
              The bag still accepts one coupon at a time.
            </span>
          </label>
        </div>
      </section>

      <section className="border border-mist/80 bg-surface/40 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-light tracking-tight text-ink">Eligibility</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <EmployeeField label="Customers">
            <select
              className={employeeInputClass()}
              value={draft.customerEligibility}
              onChange={(event) => setField("customerEligibility", event.target.value)}
            >
              {CUSTOMER_ELIGIBILITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </EmployeeField>
          <EmployeeField label="Products" error={errors.includedCategories || errors.includedCollections || errors.includedProducts}>
            <select
              className={employeeInputClass()}
              value={draft.productEligibility}
              onChange={(event) => setField("productEligibility", event.target.value)}
            >
              {PRODUCT_ELIGIBILITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </EmployeeField>
        </div>

        {draft.customerEligibility === CUSTOMER_ELIGIBILITY.SPECIFIC_CUSTOMERS ? (
          <fieldset className="mt-5">
            <legend className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
              Included customers
            </legend>
            {errors.specificCustomerIds ? (
              <p className="mb-2 font-ui text-[11px] text-accent">{errors.specificCustomerIds}</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {customers.map((customer) => {
                const id = String(customer.id);
                return (
                  <label key={id} className="flex items-center gap-2 border border-mist/70 px-3 py-2 font-ui text-sm">
                    <input
                      type="checkbox"
                      checked={draft.specificCustomerIds.includes(id)}
                      onChange={() =>
                        setField("specificCustomerIds", toggleIn(draft.specificCustomerIds, id))
                      }
                    />
                    {customer.firstName} {customer.lastName}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {draft.productEligibility === PRODUCT_ELIGIBILITY.CATEGORY ? (
          <fieldset className="mt-5">
            <legend className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
              Included categories
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 border border-mist/70 px-3 py-2 font-ui text-sm">
                  <input
                    type="checkbox"
                    checked={draft.includedCategories.includes(category.id)}
                    onChange={() =>
                      setField("includedCategories", toggleIn(draft.includedCategories, category.id))
                    }
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {draft.productEligibility === PRODUCT_ELIGIBILITY.COLLECTION ? (
          <fieldset className="mt-5">
            <legend className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
              Included collections
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <label key={collection.id} className="flex items-center gap-2 border border-mist/70 px-3 py-2 font-ui text-sm">
                  <input
                    type="checkbox"
                    checked={draft.includedCollections.includes(collection.id)}
                    onChange={() =>
                      setField(
                        "includedCollections",
                        toggleIn(draft.includedCollections, collection.id)
                      )
                    }
                  />
                  {collection.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {draft.productEligibility === PRODUCT_ELIGIBILITY.SPECIFIC_PRODUCTS ? (
          <fieldset className="mt-5">
            <legend className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-ink">
              Included products
            </legend>
            <input
              className={cn(employeeInputClass(), "mb-3")}
              placeholder="Search the catalogue"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
            />
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredProducts.map((product) => (
                <label key={product.id} className="flex items-center gap-2 border border-mist/70 px-3 py-2 font-ui text-sm">
                  <input
                    type="checkbox"
                    checked={draft.includedProducts.includes(product.id)}
                    onChange={() =>
                      setField("includedProducts", toggleIn(draft.includedProducts, product.id))
                    }
                  />
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="ml-auto font-ui text-[11px] text-taupe">
                    {categoryLabels[product.category] || product.category}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <EmployeeField label="Exclude categories">
            <select
              multiple
              className={cn(employeeInputClass(), "h-28")}
              value={draft.excludedCategories}
              onChange={(event) =>
                setField(
                  "excludedCategories",
                  Array.from(event.target.selectedOptions).map((option) => option.value)
                )
              }
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </EmployeeField>
          <EmployeeField label="Exclude collections">
            <select
              multiple
              className={cn(employeeInputClass(), "h-28")}
              value={draft.excludedCollections}
              onChange={(event) =>
                setField(
                  "excludedCollections",
                  Array.from(event.target.selectedOptions).map((option) => option.value)
                )
              }
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.label}
                </option>
              ))}
            </select>
          </EmployeeField>
          <EmployeeField label="Exclude products" hint="Search then tick below.">
            <input
              className={employeeInputClass()}
              placeholder="Find a piece to exclude"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
            />
            <div className="mt-2 max-h-24 space-y-1 overflow-y-auto">
              {filteredProducts.slice(0, 8).map((product) => (
                <label key={`ex-${product.id}`} className="flex items-center gap-2 font-ui text-xs">
                  <input
                    type="checkbox"
                    checked={draft.excludedProducts.includes(product.id)}
                    onChange={() =>
                      setField("excludedProducts", toggleIn(draft.excludedProducts, product.id))
                    }
                  />
                  <span className="truncate">{product.name}</span>
                </label>
              ))}
            </div>
          </EmployeeField>
        </div>
      </section>

      <section className="border border-mist/80 bg-surface/40 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-light tracking-tight text-ink">Estimated preview</h2>
        <p className="mt-2 font-ui text-sm text-taupe">
          A desk estimate only. Checkout remains the source of truth.
        </p>
        <div className="mt-5 max-w-xs">
          <EmployeeField label="Sample order">
            <input
              type="number"
              min="0"
              className={employeeInputClass()}
              value={sampleAmount}
              onChange={(event) => setSampleAmount(event.target.value)}
            />
          </EmployeeField>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="border border-mist/70 p-4">
            <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Order</dt>
            <dd className="mt-1 font-display text-xl">{formatINR(preview.sampleAmount)}</dd>
          </div>
          <div className="border border-mist/70 p-4">
            <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Offer</dt>
            <dd className="mt-1 font-display text-xl">{formatOfferDiscount(draft)}</dd>
          </div>
          <div className="border border-mist/70 p-4">
            <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Discount</dt>
            <dd className="mt-1 font-display text-xl text-accent">
              {preview.available ? formatINR(preview.discount) : "Unavailable"}
            </dd>
          </div>
          <div className="border border-mist/70 p-4">
            <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Final</dt>
            <dd className="mt-1 font-display text-xl">{formatINR(preview.final)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <AtelierButton type="submit" size="chip">
          {isEdit ? "Save offer" : "Create offer"}
        </AtelierButton>
        <AtelierButton type="button" variant="outline" size="chip" onClick={() => navigate(basePath)}>
          Cancel
        </AtelierButton>
      </div>
    </form>
  );
}
