import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import AdminPage from "../admin/AdminPage";
import AdminPanel from "../admin/AdminPanel";
import EmployeePage from "../employee/EmployeePage";
import { AtelierButton } from "../../design-system";
import InventoryNav from "./InventoryNav";
import { useInventory } from "../../context/InventoryContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { ROLES } from "../../config/employeeRoles";
import catalogRepository from "../../services/catalogRepository";
import { LOCATION_TYPES } from "../../services/inventory/inventoryRepository";

const fieldClass = "mt-2 h-11 w-full border border-mist bg-canvas px-3 font-ui text-sm text-ink outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "font-ui text-[10px] uppercase tracking-[.15em] text-taupe";

const actorFor = (portal, admin, employee) => portal === "admin"
  ? { adminId: admin?.adminId, name: admin?.name || "Administrator" }
  : employee;

export default function InventoryOperationPage({ portal = "admin", operation = "receive" }) {
  const inventory = useInventory();
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();
  const [searchParams] = useSearchParams();
  const prefilledRecord = inventory.records.find((row) => row.id === searchParams.get("inventoryId"));
  const prefilledProduct = searchParams.get("productId") || prefilledRecord?.productId || "";
  const prefilledLocation = searchParams.get("locationId") || prefilledRecord?.locationId || "";
  const [form, setForm] = useState({
    productId: prefilledProduct,
    variantId: prefilledRecord?.variantId || "",
    locationId: prefilledLocation,
    quantity: "",
    adjustment: "",
    supplier: "",
    reference: "",
    reason: operation === "adjust" ? "Counting Correction" : "",
    notes: "",
    department: prefilledRecord?.placement.department || "",
    section: prefilledRecord?.placement.section || "",
    zone: prefilledRecord?.placement.zone || "",
    rack: prefilledRecord?.placement.rack || "",
    shelf: prefilledRecord?.placement.shelf || "",
    bin: prefilledRecord?.placement.bin || "",
    adjustType: "ADJUST",
  });
  const [productSearch, setProductSearch] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const Page = portal === "admin" ? AdminPage : EmployeePage;
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const actor = actorFor(portal, admin, employee);
  const warehouseOnly = portal === "employee" && employee?.role === ROLES.WAREHOUSE_STAFF;
  const locations = inventory.locations.filter((location) =>
    location.status === "ACTIVE" && (!warehouseOnly || location.type === LOCATION_TYPES.WAREHOUSE)
  );
  const products = useMemo(() => catalogRepository.all().filter((product) =>
    product.status !== "ARCHIVED" && (!productSearch.trim() || [product.name, product.sku, product.category]
      .join(" ").toLowerCase().includes(productSearch.trim().toLowerCase()))
  ), [productSearch]);
  const product = catalogRepository.find(form.productId);
  const variants = product?.variants?.filter((variant) => variant.status !== "INACTIVE") || [];
  const selectedRow = inventory.records.find((row) =>
    row.productId === form.productId &&
    row.locationId === form.locationId &&
    String(row.variantId || "") === String(form.variantId || "")
  );
  const current = selectedRow?.quantity || { onHand: 0, available: 0, reserved: 0, damaged: 0, returned: 0 };
  const adjustment = Number(form.adjustment) || 0;
  const requiresVariant = variants.length > 0 && !(selectedRow && !selectedRow.variantId);
  const isReceive = operation === "receive";
  const predicted = isReceive
    ? current.available + Math.max(0, Number(form.quantity) || 0)
    : form.adjustType === "ADJUST"
      ? Math.max(0, current.available + adjustment)
      : form.adjustType === "DAMAGE"
        ? Math.max(0, current.available - (Number(form.quantity) || 0))
        : form.adjustType === "INSPECT_SELLABLE"
          ? current.available + (Number(form.quantity) || 0)
          : current.available;

  const patch = (partial) => setForm((currentForm) => ({ ...currentForm, ...partial }));

  const submit = () => {
    const common = {
      productId: form.productId,
      variantId: form.variantId || null,
      locationId: form.locationId,
      reference: form.reference,
      reason: form.reason,
      notes: form.notes,
      placement: isReceive ? {
        department: form.department,
        section: form.section,
        zone: form.zone,
        rack: form.rack,
        shelf: form.shelf,
        bin: form.bin,
      } : null,
      actor,
    };
    let result;
    if (isReceive) {
      result = inventory.receiveStock({ ...common, quantity: form.quantity, supplier: form.supplier });
    } else if (form.adjustType === "ADJUST") {
      result = inventory.adjustStock({ ...common, adjustment: form.adjustment });
    } else if (form.adjustType === "DAMAGE") {
      result = inventory.markDamaged({ ...common, quantity: form.quantity });
    } else if (form.adjustType === "RETURN") {
      result = inventory.returnStock({ ...common, quantity: form.quantity });
    } else {
      result = inventory.inspectReturnedStock({
        ...common,
        quantity: form.quantity,
        condition: form.adjustType === "INSPECT_DAMAGED" ? "DAMAGED" : "SELLABLE",
      });
    }

    setConfirming(false);
    if (!result?.ok) {
      setFeedback({ kind: "error", message: result?.error || "The stock movement could not be completed." });
      return;
    }
    const amount = Math.abs(Number(form.adjustment || form.quantity) || 0);
    setFeedback({
      kind: "success",
      message: isReceive
        ? `${amount} unit${amount === 1 ? "" : "s"} received.`
        : `${form.adjustType.replaceAll("_", " ").toLowerCase()} recorded for ${amount} unit${amount === 1 ? "" : "s"}.`,
    });
    patch({ quantity: "", adjustment: "", reference: "", notes: "" });
  };

  const requiredReady = form.productId && form.locationId && (!requiresVariant || form.variantId) &&
    (isReceive || form.adjustType !== "ADJUST" ? Number(form.quantity) > 0 : Number(form.adjustment) !== 0);

  const title = isReceive ? "Receive Stock" : "Adjust Stock";
  const description = isReceive
    ? "Record supplier or internal receiving into an active store or warehouse location."
    : "Correct counted stock, quarantine damage, receive returns and complete return inspection without a silent quantity change.";

  return (
    <Page
      eyebrow={`${portal === "admin" ? "Business" : "Retail operations"} / Inventory`}
      title={title}
      description={description}
      actions={<AtelierButton as={Link} to={root} variant="outline" size="chip">Back to inventory</AtelierButton>}
    >
      <InventoryNav portal={portal} />

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mb-6 flex items-start gap-3 border p-4 font-ui text-sm ${feedback.kind === "error" ? "border-accent/40 bg-accent/[0.05] text-accent" : "border-cocoa/25 bg-cocoa/[0.05] text-cocoa"}`}
        >
          {feedback.kind === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
        <AdminPanel eyebrow="Stock operation" title={title}>
          {!isReceive ? (
            <fieldset className="mb-6 border-b border-mist/70 pb-6">
              <legend className={labelClass}>Operation</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["ADJUST", "Count adjustment"],
                  ["DAMAGE", "Mark damaged"],
                  ["RETURN", "Receive return"],
                  ["INSPECT_SELLABLE", "Inspect · sellable"],
                  ["INSPECT_DAMAGED", "Inspect · damaged"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={form.adjustType === value}
                    onClick={() => patch({ adjustType: value, reason: value === "ADJUST" ? "Counting Correction" : "" })}
                    className={`border px-3 py-2 font-ui text-[10px] uppercase tracking-[.12em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${form.adjustType === value ? "border-ink bg-ink text-ivory" : "border-mist text-taupe hover:border-ink hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); if (requiredReady) setConfirming(true); }}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Product search
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className={fieldClass}
                  placeholder="Search by product name, SKU or category"
                />
              </label>
              <label className={labelClass}>
                Product <span className="text-accent">*</span>
                <select
                  required
                  className={fieldClass}
                  value={form.productId}
                  onChange={(event) => patch({ productId: event.target.value, variantId: "" })}
                >
                  <option value="">Select catalogue product</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Variant
                <select
                  className={fieldClass}
                  value={form.variantId}
                  disabled={!variants.length}
                  onChange={(event) => patch({ variantId: event.target.value })}
                >
                  <option value="">{variants.length ? "Choose active variant" : "No variants — product level"}</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{[variant.color, variant.size].filter(Boolean).join(" / ")} · {variant.sku || "No variant SKU"}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                {isReceive ? "Destination" : "Location"} <span className="text-accent">*</span>
                <select required className={fieldClass} value={form.locationId} onChange={(event) => patch({ locationId: event.target.value })}>
                  <option value="">Select location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.type}</option>)}
                </select>
              </label>
              {isReceive || form.adjustType !== "ADJUST" ? (
                <label className={labelClass}>
                  Quantity <span className="text-accent">*</span>
                  <input required min="1" step="1" type="number" className={fieldClass} value={form.quantity} onChange={(event) => patch({ quantity: event.target.value })} />
                </label>
              ) : (
                <label className={labelClass}>
                  Adjustment quantity <span className="text-accent">*</span>
                  <input required step="1" type="number" className={fieldClass} value={form.adjustment} onChange={(event) => patch({ adjustment: event.target.value })} placeholder="Use + or −" />
                </label>
              )}
              {isReceive ? (
                <>
                  <label className={labelClass}>
                    Department
                    <input type="text" className={fieldClass} value={form.department} onChange={(event) => patch({ department: event.target.value })} placeholder="Sarees, Men, Kids…" />
                  </label>
                  <label className={labelClass}>
                    Section / zone
                    <input type="text" className={fieldClass} value={form.section || form.zone} onChange={(event) => patch({ section: event.target.value, zone: event.target.value })} placeholder="Silk Section / Zone A" />
                  </label>
                  <label className={labelClass}>
                    Rack
                    <input type="text" className={fieldClass} value={form.rack} onChange={(event) => patch({ rack: event.target.value })} placeholder="S-12 / A-12" />
                  </label>
                  <label className={labelClass}>
                    Shelf / bin
                    <input type="text" className={fieldClass} value={form.shelf || form.bin} onChange={(event) => patch({ shelf: event.target.value, bin: event.target.value })} placeholder="Shelf B / A12-03" />
                  </label>
                </>
              ) : null}
              {isReceive ? (
                <label className={labelClass}>
                  Supplier
                  <input type="text" className={fieldClass} value={form.supplier} onChange={(event) => patch({ supplier: event.target.value })} placeholder="Supplier or internal source" />
                </label>
              ) : (
                <label className={labelClass}>
                  Reason <span className="text-accent">*</span>
                  {form.adjustType === "ADJUST" ? (
                    <select className={fieldClass} value={form.reason} onChange={(event) => patch({ reason: event.target.value })}>
                      {[
                        "Counting Correction",
                        "Opening Balance",
                        "Damage Correction",
                        "System Correction",
                        "Other",
                      ].map((reason) => <option key={reason}>{reason}</option>)}
                    </select>
                  ) : (
                    <input required type="text" className={fieldClass} value={form.reason} onChange={(event) => patch({ reason: event.target.value })} placeholder="Reason for this operation" />
                  )}
                </label>
              )}
              <label className={labelClass}>
                Reference
                <input type="text" className={fieldClass} value={form.reference} onChange={(event) => patch({ reference: event.target.value })} placeholder={isReceive ? "Invoice / GRN / PO" : "Count / return / damage reference"} />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Notes
                <textarea className="mt-2 min-h-24 w-full resize-y border border-mist bg-canvas p-3 font-ui text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" value={form.notes} onChange={(event) => patch({ notes: event.target.value })} placeholder="Operational notes for the movement ledger" />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-mist/70 pt-5">
              <AtelierButton type="submit" disabled={!requiredReady}>{title}</AtelierButton>
              <AtelierButton as={Link} to={root} variant="outline">Cancel</AtelierButton>
            </div>
          </form>
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel eyebrow="Quantity preview" title="Before & after">
            <dl className="space-y-3 font-ui text-sm">
              {[
                ["Product", product?.name || "Select a product"],
                ["Location", inventory.locations.find((location) => location.id === form.locationId)?.name || "Select a location"],
                ["On hand", current.onHand],
                ["Available before", current.available],
                [isReceive ? "Receiving" : "Movement", isReceive ? `+${Number(form.quantity) || 0}` : form.adjustType === "ADJUST" ? `${adjustment > 0 ? "+" : ""}${adjustment}` : form.adjustType === "DAMAGE" ? `−${Number(form.quantity) || 0}` : form.adjustType === "INSPECT_SELLABLE" ? `+${Number(form.quantity) || 0}` : "Quarantine"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-mist/60 pb-3 last:border-0 last:pb-0">
                  <dt className="text-taupe">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex items-center justify-between gap-4 border-l-2 border-accent bg-canvas p-4">
              <span className="font-ui text-[10px] uppercase tracking-[.15em] text-taupe">Available after</span>
              <span className="font-display text-3xl text-ink">{predicted}</span>
            </div>
            {form.adjustType?.startsWith("INSPECT") ? (
              <p className="mt-4 font-ui text-[11px] leading-relaxed text-taupe">
                Returned units stay quarantined until this inspection. Sellable units become on-hand; damaged units remain unavailable.
              </p>
            ) : null}
          </AdminPanel>
          <AdminPanel eyebrow="Audit rule" title="No silent changes">
            <p className="font-ui text-xs leading-relaxed text-taupe">
              Confirmation writes an immutable movement with product, variant, location, before/after quantities, employee, timestamp, reference and reason.
            </p>
          </AdminPanel>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="stock-confirm-title" onKeyDown={(event) => { if (event.key === "Escape") setConfirming(false); }} className="w-full max-w-lg border border-mist bg-ivory p-6 shadow-2xl sm:p-8">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Confirm stock movement</p>
            <h2 id="stock-confirm-title" className="mt-2 font-display text-3xl font-light text-ink">Record this {title.toLowerCase()}?</h2>
            <p className="mt-3 font-ui text-sm leading-relaxed text-taupe">
              {product?.name} · {inventory.locations.find((location) => location.id === form.locationId)?.name}. This action will appear in Movement History.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AtelierButton autoFocus onClick={submit}>Confirm <ArrowRight size={13} aria-hidden="true" /></AtelierButton>
              <AtelierButton variant="outline" onClick={() => setConfirming(false)}>Go back</AtelierButton>
            </div>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
