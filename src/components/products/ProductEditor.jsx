/**
 * PRATIKSHYA FASHON — The complete product & merchandising workspace.
 *
 * One editor serves both portals: Admin wields it with publishing rights,
 * employees with `products.manage` use it to draft and submit for review.
 * Everything writes to the shared catalogue repository — there is no
 * second product system.
 *
 * Workflow:
 *   DRAFT → SUBMITTED → APPROVED → PUBLISHED
 *   SUBMITTED → RETURNED → DRAFT (returned to the author with a reason)
 *
 * Creation, editing, and every transition call the universal workflow
 * command layer. The editor never writes lifecycle status itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, RotateCcw, Archive } from "lucide-react";
import { AtelierButton } from "../../design-system";
import catalogRepository, { getPublishIssues } from "../../services/catalogRepository";
import inventoryRepository from "../../services/inventory/inventoryRepository";
import {
  archiveProduct,
  createProduct,
  publishProduct,
  restoreProduct,
  saveProductDraft,
  submitProduct,
} from "../../services/workflow/productWorkflowCommands";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../../services/workflow/productWorkflowState";
import { computePricing } from "../../utils/pricing";
import { PRODUCT_STATUSES, REVIEW_STATES } from "../../config/productCatalogConfig";
import { departmentForProduct } from "../../data/products/departments";
import { SectionBasics, SectionAttributes } from "./editorSectionsBasics";
import { SectionPricing, SectionVariants } from "./editorSectionsCommerce";
import { SectionContent, SectionMedia, SectionSeo, SectionPublishing } from "./editorSectionsContent";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/* Draft shape                                                         */
/* ------------------------------------------------------------------ */

const emptyDraft = () => ({
  id: null,
  exists: false,
  department: "",
  name: "",
  sku: "",
  brand: "Pratikshya Fashon",
  productType: "fashion",
  productCode: "",
  barcode: "",
  internalReference: "",
  category: "",
  subcategory: "",
  gender: "Women",
  shortDescription: "",
  description: "",
  highlights: [],
  specifications: {},
  careInstructions: [],
  deliveryInfo: "",
  returnInfo: "",
  returnPolicy: { eligibility: "", window: "", notes: "" },
  fabric: "",
  material: "",
  primaryColor: "",
  secondaryColor: "",
  colors: [],
  patterns: [],
  work: [],
  occasion: [],
  sizes: [],
  season: "",
  fit: "",
  length: "",
  collection: "",
  collections: [],
  tags: [],
  image: "",
  pricing: {
    mrp: "",
    sellingPrice: "",
    discountType: "none",
    discountValue: "",
    taxMode: "INCLUSIVE",
    taxRate: 0,
    customTaxRate: false,
  },
  variants: [],
  stock: 0,
  availability: "in-stock",
  inventoryTracked: false,
  lowStockThreshold: 5,
  seo: { title: "", description: "" },
  slug: "",
  status: PRODUCT_STATUSES.DRAFT,
  review: { state: REVIEW_STATES.NONE, rejectionReason: "" },
  isFeatured: false,
  isBestseller: false,
  isNew: false,
  isLimitedEdition: false,
  isTrending: false,
});

const draftFromProduct = (product) => ({
  ...emptyDraft(),
  ...product,
  exists: true,
  id: product.id,
  department: departmentForProduct(product) || "",
  image: product.image?.src || product.image || "",
  pricing: {
    mrp: product.pricing?.mrp ?? product.originalPrice ?? product.price ?? "",
    sellingPrice: product.pricing?.sellingPrice ?? product.price ?? "",
    discountType: product.pricing?.discountType || "none",
    discountValue: product.pricing?.discountValue || "",
    taxMode: product.pricing?.taxMode || "INCLUSIVE",
    taxRate: product.pricing?.taxRate ?? 0,
    customTaxRate: Boolean(product.pricing?.customTaxRate),
  },
  variants: (product.variants || []).map((variant) => ({
    ...variant,
    priceOverride: variant.priceOverride ?? "",
  })),
  highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
  careInstructions: Array.isArray(product.careInstructions) ? [...product.careInstructions] : [],
  specifications:
    product.specifications && typeof product.specifications === "object"
      ? { ...product.specifications }
      : {},
  returnPolicy:
    product.returnPolicy && typeof product.returnPolicy === "object"
      ? { ...product.returnPolicy }
      : { eligibility: "", window: "", notes: "" },
});

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "basics", label: "Basic Information" },
  { id: "attributes", label: "Category & Attributes" },
  { id: "pricing", label: "Pricing" },
  { id: "variants", label: "Variants" },
  { id: "content", label: "Product Content" },
  { id: "media", label: "Media" },
  { id: "seo", label: "SEO" },
  { id: "publishing", label: "Publishing" },
];

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export default function ProductEditor({
  productId = null,
  portal = "admin",
  actor = null,
  canPublish = false,
  exitTo = "/admin/products",
}) {
  const navigate = useNavigate();
  const savedProduct = productId ? catalogRepository.find(productId) : null;

  const [draft, setDraft] = useState(() =>
    savedProduct ? draftFromProduct(savedProduct) : emptyDraft()
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [section, setSection] = useState("basics");
  const [feedback, setFeedback] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const tabRefs = useRef({});

  const dirty = JSON.stringify(draft) !== baseline;
  const isNew = !draft.exists;

  const patch = useCallback((partial) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  /* --- unsaved changes -------------------------------------------- */

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* --- validation --------------------------------------------------- */

  const errors = useMemo(() => {
    const next = {};
    if (!draft.name.trim()) next.name = "Product name is required.";
    if (!draft.sku.trim()) next.sku = "SKU is required.";
    else if (catalogRepository.skuTaken(draft.sku, draft.id)) {
      next.sku = "This SKU is already in use by another product or variant.";
    }
    if (!draft.category) next.category = "Category is required.";
    if (!draft.description.trim() && !draft.shortDescription.trim()) {
      next.description = "A description is required.";
    }
    if (draft.slug && catalogRepository.slugTaken(draft.slug, draft.id)) {
      next.slug = "This URL slug is already in use.";
    }
    const skus = draft.variants.map((variant) => variant.sku).filter(Boolean);
    if (new Set(skus).size !== skus.length) {
      next.variants = "Variant SKUs must be unique within the product.";
    } else if (
      draft.variants.some(
        (variant) => variant.sku && catalogRepository.skuTaken(variant.sku, draft.id)
      )
    ) {
      next.variants = "A variant SKU is already used elsewhere in the catalogue.";
    }
    return next;
  }, [draft]);

  const pricingErrors = useMemo(() => computePricing(draft.pricing).errors, [draft.pricing]);

  const publishIssues = useMemo(() => {
    if (isNew) return ["Save the product first, then add a cover image."];
    const issues = getPublishIssues({ ...savedProduct, ...draft, id: draft.id });
    return issues;
  }, [draft, isNew, savedProduct]);

  const sectionDot = (id) => {
    if (id === "basics") return Boolean(errors.name || errors.sku || errors.category || errors.description);
    if (id === "pricing") return pricingErrors.length > 0;
    if (id === "variants") return Boolean(errors.variants);
    if (id === "seo") return Boolean(errors.slug);
    return false;
  };

  /* --- persistence -------------------------------------------------- */

  const buildPayload = () => {
    const pricing = {
      ...draft.pricing,
      mrp: Number(draft.pricing.mrp) || 0,
      sellingPrice: Number(draft.pricing.sellingPrice) || 0,
      discountValue: Number(draft.pricing.discountValue) || 0,
      taxRate: Number(draft.pricing.taxRate) || 0,
    };

    /* Product identity and lifecycle fields are command-owned. Normalized
       records include them for display, but the editor must never send them
       back as an editable patch. */
    const commandOwnedFields = new Set([
      "id",
      "productId",
      "exists",
      "status",
      "review",
      "workflow",
      "published",
      "publishedAt",
      "publishedBy",
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "history",
      "priceHistory",
    ]);
    const editableDraft = Object.fromEntries(
      Object.entries(draft).filter(([field]) => !commandOwnedFields.has(field))
    );

    return {
      ...editableDraft,
      pricing,
      stock: Number(draft.stock) || 0,
      lowStockThreshold: Number(draft.lowStockThreshold) || 0,
      variants: draft.variants.map((variant) => ({
        ...variant,
        stock: Number(variant.stock) || 0,
        priceOverride:
          variant.priceOverride === "" || variant.priceOverride == null
            ? null
            : Number(variant.priceOverride) || null,
      })),
      slug: draft.slug || catalogRepository.suggestSlug(draft.name, draft.id),
      collection: draft.collections[0] ?? draft.collection ?? "",
    };
  };

  const persist = () => {
    const payload = buildPayload();
    const result = draft.exists
      ? saveProductDraft(draft.id, payload, actor)
      : createProduct(payload, actor);
    if (!result.ok) {
      setFeedback({ kind: "error", message: result.error || "The product could not be saved." });
      return null;
    }
    if (result.product.status === PRODUCT_STATUSES.PUBLISHED) {
      inventoryRepository.ensureOpeningStock(result.product, actor);
    }
    const nextDraft = draftFromProduct(result.product);
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    return result.product;
  };

  const announce = (message, kind = "success") => setFeedback({ kind, message });

  /* --- actions ------------------------------------------------------ */

  const handleSaveDraft = () => {
    if (!draft.name.trim()) {
      setSection("basics");
      announce("Give the product a name before saving.", "error");
      return;
    }
    if (errors.sku) {
      setSection("basics");
      announce(errors.sku, "error");
      return;
    }
    const product = persist();
    if (!product) return;
    announce("Draft saved successfully.");
    if (isNew) navigate(`${portal === "admin" ? "/admin" : "/employee"}/products/${product.id}/edit`, { replace: true });
  };

  const handleSaveAndContinue = () => {
    if (!draft.name.trim()) {
      setSection("basics");
      announce("Give the product a name before saving.", "error");
      return;
    }
    if (errors.sku) {
      setSection("basics");
      announce(errors.sku, "error");
      return;
    }
    const product = persist();
    if (!product) return;
    const currentIndex = SECTIONS.findIndex((s) => s.id === section);
    if (currentIndex < SECTIONS.length - 1) {
      setSection(SECTIONS[currentIndex + 1].id);
      announce("Progress saved. Moved to next section.");
    } else {
      announce("Draft saved successfully.");
    }
  };

  const handleSubmitForReview = () => {
    const blocking = [errors.name, errors.sku, errors.category, errors.description, errors.variants, errors.slug].filter(Boolean);
    if (blocking.length || pricingErrors.length) {
      announce("Complete the required fields before submitting for review.", "error");
      return;
    }
    const product = persist();
    if (!product) return;
    const result = submitProduct(product.id, actor);
    if (!result.ok) {
      announce(result.error || "Submission failed.", "error");
      return;
    }
    const nextDraft = draftFromProduct(result.product);
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    announce("Submitted for review. A manager or admin will approve it.");
    setTimeout(() => navigate(exitTo), 900);
  };

  const handlePublish = () => {
    if (!draft.id) return;
    if (dirty) {
      announce(
        "Approved products cannot be edited during publication. Return the product to an editable stage before changing it.",
        "error"
      );
      return;
    }
    const result = publishProduct(draft.id, actor);
    if (!result.ok) {
      announce((result.errors ?? [result.error]).join(" "), "error");
      return;
    }
    inventoryRepository.ensureOpeningStock(result.product, actor);
    const nextDraft = draftFromProduct(result.product);
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    announce("Published — this piece is now live in the storefront.");
  };

  const handleArchive = () => {
    if (!draft.id) return;
    const result = archiveProduct(draft.id, actor);
    if (result.ok) {
      const nextDraft = draftFromProduct(result.product);
      setDraft(nextDraft);
      setBaseline(JSON.stringify(nextDraft));
      announce("Product archived.");
    }
  };

  const handleRestore = () => {
    if (!draft.id) return;
    const result = restoreProduct(draft.id, actor);
    if (result.ok) {
      const nextDraft = draftFromProduct(result.product);
      setDraft(nextDraft);
      setBaseline(JSON.stringify(nextDraft));
      announce("Product restored to draft.");
    }
  };

  const handleCancel = () => {
    if (dirty) {
      setConfirmCancel(true);
      return;
    }
    navigate(exitTo);
  };

  /* --- tab keyboard -------------------------------------------------- */

  const onTabKeyDown = (event) => {
    const index = SECTIONS.findIndex((entry) => entry.id === section);
    let next = null;
    if (event.key === "ArrowRight") next = SECTIONS[(index + 1) % SECTIONS.length];
    else if (event.key === "ArrowLeft") next = SECTIONS[(index - 1 + SECTIONS.length) % SECTIONS.length];
    else if (event.key === "Home") next = SECTIONS[0];
    else if (event.key === "End") next = SECTIONS[SECTIONS.length - 1];
    if (next) {
      event.preventDefault();
      setSection(next.id);
      tabRefs.current[next.id]?.focus();
    }
  };

  const currentSectionIndex = SECTIONS.findIndex((s) => s.id === section);
  const prevSection = currentSectionIndex > 0 ? SECTIONS[currentSectionIndex - 1] : null;
  const nextSection = currentSectionIndex < SECTIONS.length - 1 ? SECTIONS[currentSectionIndex + 1] : null;

  if (productId && !savedProduct) {
    return (
      <div className="border border-mist/80 bg-canvas p-8 text-center">
        <p className="font-display text-2xl font-light text-ink">Product unavailable</p>
        <p className="mt-2 font-ui text-sm text-taupe">That product could not be found in the catalogue.</p>
        <AtelierButton size="chip" className="mt-5" onClick={() => navigate(exitTo)}>
          Back to products
        </AtelierButton>
      </div>
    );
  }

  const workflowState = getProductWorkflowState(draft);
  const editorLocked = draft.exists && !workflowState.editable;
  const readyToPublish =
    canPublish && draft.exists && workflowState.stage === WORKFLOW_STAGES.APPROVED;

  return (
    <div className="pb-24">
      {/* Rejection Alert Header */}
      {draft.review?.state === "REJECTED" && draft.review.rejectionReason ? (
        <div className="mb-6 border-l-4 border-accent bg-accent/[0.06] p-4 text-ink">
          <p className="font-ui text-[11px] uppercase tracking-wider text-accent font-semibold">
            Action Required: Reviewer Rejection
          </p>
          <p className="mt-1 font-ui text-sm font-medium text-accent">
            &ldquo;{draft.review.rejectionReason}&rdquo;
          </p>
          <p className="mt-2 font-ui text-xs text-taupe">
            Please make the necessary corrections across the tabs below and click &quot;Submit for review&quot; to resubmit.
          </p>
        </div>
      ) : null}

      {/* Section tabs */}
      <div className="mb-8 overflow-x-auto border-b border-mist/80" role="tablist" aria-label="Product sections" onKeyDown={onTabKeyDown}>
        <div className="flex min-w-max gap-1">
          {SECTIONS.map((entry) => {
            const active = section === entry.id;
            const hasIssue = sectionDot(entry.id);
            return (
              <button
                key={entry.id}
                ref={(node) => {
                  tabRefs.current[entry.id] = node;
                }}
                type="button"
                role="tab"
                id={`tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`panel-${entry.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setSection(entry.id)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-3 font-ui text-[10px] uppercase tracking-[.16em] transition-colors",
                  active
                    ? "border-b-2 border-accent text-ink font-semibold"
                    : "border-b-2 border-transparent text-taupe hover:text-ink"
                )}
              >
                {entry.label}
                {hasIssue ? (
                  <span
                    aria-label="needs attention"
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback line */}
      <div aria-live="polite" className="min-h-6">
        {feedback ? (
          <p
            className={cn(
              "mb-5 border px-4 py-3 font-ui text-sm",
              feedback.kind === "error"
                ? "border-accent/40 bg-accent/[0.05] text-accent"
                : "border-mist/80 bg-canvas text-ink"
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>

      {editorLocked ? (
        <p className="mb-6 flex items-start gap-3 border border-amber-500/40 bg-amber-500/10 p-4 font-ui text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          This product is {workflowState.label.toLowerCase()} and cannot be edited in that lifecycle
          stage. Use Product Review to approve, publish, return, or archive it through the canonical
          workflow.
        </p>
      ) : null}

      {/* Active panel */}
      <div
        role="tabpanel"
        id={`panel-${section}`}
        aria-labelledby={`tab-${section}`}
        className="border border-mist/80 bg-surface/40 p-5 sm:p-7"
      >
        {section === "basics" ? <SectionBasics draft={draft} patch={patch} errors={errors} isNew={isNew} /> : null}
        {section === "attributes" ? (
          <SectionAttributes draft={draft} patch={patch} errors={errors} isNew={isNew} />
        ) : null}
        {section === "pricing" ? <SectionPricing draft={draft} patch={patch} /> : null}
        {section === "variants" ? <SectionVariants draft={draft} patch={patch} errors={errors} /> : null}
        {section === "content" ? <SectionContent draft={draft} patch={patch} /> : null}
        {section === "media" ? <SectionMedia draft={draft} patch={patch} portal={portal} /> : null}
        {section === "seo" ? <SectionSeo draft={draft} patch={patch} errors={errors} /> : null}
        {section === "publishing" ? (
          <SectionPublishing draft={draft} patch={patch} publishIssues={publishIssues} />
        ) : null}

        {/* Section stepping navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-mist/70 pt-5">
          {prevSection ? (
            <button
              type="button"
              onClick={() => setSection(prevSection.id)}
              className="inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-wider text-taupe transition-colors hover:text-ink"
            >
              <ArrowLeft size={13} aria-hidden="true" /> {prevSection.label}
            </button>
          ) : (
            <span />
          )}

          {nextSection ? (
            <button
              type="button"
              onClick={() => setSection(nextSection.id)}
              className="inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-wider text-ink transition-colors hover:text-accent font-medium"
            >
              {nextSection.label} <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-8 flex flex-col-reverse gap-3 border border-mist/80 bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AtelierButton variant="outline" size="chip" onClick={handleCancel}>
            Cancel
          </AtelierButton>
          {dirty ? (
            <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draft.exists && draft.status === PRODUCT_STATUSES.ARCHIVED ? (
            <AtelierButton variant="outline" size="chip" onClick={handleRestore}>
              <RotateCcw size={12} className="mr-1 inline" aria-hidden="true" /> Restore
            </AtelierButton>
          ) : draft.exists && canPublish ? (
            <AtelierButton variant="outline" size="chip" onClick={handleArchive}>
              <Archive size={12} className="mr-1 inline" aria-hidden="true" /> Archive
            </AtelierButton>
          ) : null}

          <AtelierButton
            variant="outline"
            size="chip"
            onClick={handleSaveDraft}
            disabled={editorLocked}
          >
            Save draft
          </AtelierButton>
          <AtelierButton
            variant="outline"
            size="chip"
            onClick={handleSaveAndContinue}
            disabled={editorLocked}
          >
            Save &amp; continue
          </AtelierButton>

          {readyToPublish ? (
            <AtelierButton size="chip" onClick={handlePublish}>
              Publish approved product
            </AtelierButton>
          ) : !editorLocked ? (
            <AtelierButton size="chip" onClick={handleSubmitForReview}>
              Submit for review
            </AtelierButton>
          ) : null}
        </div>
      </div>

      {/* Cancel confirmation */}
      {confirmCancel ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Discard unsaved changes?"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setConfirmCancel(false)}
        >
          <div
            className="w-full max-w-md border border-mist bg-ivory p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-display text-2xl font-light text-ink">Leave without saving?</p>
            <p className="mt-3 font-ui text-sm leading-relaxed text-taupe">
              This product has unsaved changes. If you leave now, everything entered since the last
              save will be lost.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <AtelierButton
                size="chip"
                onClick={() => {
                  setConfirmCancel(false);
                }}
              >
                Keep editing
              </AtelierButton>
              <AtelierButton
                variant="outline"
                size="chip"
                onClick={() => {
                  setConfirmCancel(false);
                  navigate(exitTo);
                }}
              >
                Discard &amp; leave
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
