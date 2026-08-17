import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Truck } from "lucide-react";
import AdminPage from "../admin/AdminPage";
import AdminPanel from "../admin/AdminPanel";
import EmployeePage from "../employee/EmployeePage";
import DataTable from "../employee/DataTable";
import { AtelierButton } from "../../design-system";
import InventoryNav from "./InventoryNav";
import InventoryStatusBadge from "./InventoryStatusBadge";
import { useInventory } from "../../context/InventoryContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { ROLES } from "../../config/employeeRoles";
import catalogRepository from "../../services/catalogRepository";
import { TRANSFER_STATES } from "../../services/inventory/inventoryRepository";
import { formatEmployeeDateTime } from "../../utils/employee";

const fieldClass = "mt-2 h-11 w-full border border-mist bg-canvas px-3 font-ui text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:opacity-50";
const labelClass = "font-ui text-[10px] uppercase tracking-[.15em] text-taupe";

export default function InventoryTransfersPage({ portal = "admin" }) {
  const inventory = useInventory();
  const { admin } = useAdminAuth();
  const { employee, hasPermission } = useEmployeeAuth();
  const [searchParams] = useSearchParams();
  const prefilled = inventory.records.find((row) => row.id === searchParams.get("inventoryId"));
  const [form, setForm] = useState({
    sourceLocationId: prefilled?.locationId || "",
    destinationLocationId: "",
    productId: prefilled?.productId || "",
    variantId: prefilled?.variantId || "",
    quantity: "",
    reason: "Store replenishment",
    notes: "",
  });
  const [feedback, setFeedback] = useState(null);
  const Page = portal === "admin" ? AdminPage : EmployeePage;
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const actor = portal === "admin"
    ? { adminId: admin?.adminId, name: admin?.name || "Administrator" }
    : employee;
  const products = useMemo(() => catalogRepository.all().filter((product) => product.status !== "ARCHIVED"), []);
  const product = catalogRepository.find(form.productId);
  const variants = product?.variants?.filter((variant) => variant.status !== "INACTIVE") || [];
  const sourceRecord = inventory.records.find((row) =>
    row.productId === form.productId &&
    row.locationId === form.sourceLocationId &&
    String(row.variantId || "") === String(form.variantId || "")
  );
  const destinationRecord = inventory.records.find((row) =>
    row.productId === form.productId &&
    row.locationId === form.destinationLocationId &&
    String(row.variantId || "") === String(form.variantId || "")
  );
  const quantity = Math.max(0, Number(form.quantity) || 0);
  const requiresVariant = variants.length > 0 && !(sourceRecord && !sourceRecord.variantId);
  const pendingOutbound = inventory.transfers
    .filter((transfer) =>
      transfer.sourceLocationId === form.sourceLocationId &&
      transfer.productId === form.productId &&
      String(transfer.variantId || "") === String(form.variantId || "") &&
      [TRANSFER_STATES.REQUESTED, TRANSFER_STATES.APPROVED].includes(transfer.status)
    )
    .reduce((sum, transfer) => sum + transfer.quantity, 0);
  const requestableAtSource = Math.max(0, (sourceRecord?.quantity.available || 0) - pendingOutbound);
  const warehouseStaff = portal === "employee" && employee?.role === ROLES.WAREHOUSE_STAFF;
  const visibleTransfers = warehouseStaff
    ? inventory.transfers.filter((transfer) => [transfer.source, transfer.destination]
        .some((location) => location?.type === "WAREHOUSE"))
    : inventory.transfers;
  const transferTouchesWarehouse = [form.sourceLocationId, form.destinationLocationId].some((id) =>
    inventory.locations.find((location) => location.id === id)?.type === "WAREHOUSE"
  );
  const ready = form.sourceLocationId && form.destinationLocationId && form.productId && (!requiresVariant || form.variantId) && quantity > 0 &&
    quantity <= requestableAtSource && form.sourceLocationId !== form.destinationLocationId &&
    (!warehouseStaff || transferTouchesWarehouse);

  const create = (draft = false) => {
    if (!ready) return;
    const result = inventory.createTransfer({ ...form, quantity, variantId: form.variantId || null, actor, draft });
    if (!result.ok) {
      setFeedback({ kind: "error", message: result.error });
      return;
    }
    setFeedback({ kind: "success", message: `${result.transfer.id} ${draft ? "saved as draft" : "requested"}. Destination stock will update only after receipt.` });
    setForm((current) => ({ ...current, quantity: "", notes: "" }));
  };

  const progress = (transfer, status) => {
    const result = inventory.transitionTransfer(transfer.id, status, actor);
    setFeedback(result.ok
      ? { kind: "success", message: `${transfer.id} moved to ${status.replaceAll("_", " ").toLowerCase()}.` }
      : { kind: "error", message: result.error });
  };

  const canManage = portal === "admin" || hasPermission(PERMISSIONS.INVENTORY_MANAGE) || employee?.role === ROLES.STORE_MANAGER;
  const nextAction = (transfer) => {
    if (transfer.status === TRANSFER_STATES.DRAFT) return [TRANSFER_STATES.REQUESTED, "Request"];
    if (transfer.status === TRANSFER_STATES.REQUESTED && canManage) return [TRANSFER_STATES.APPROVED, "Approve"];
    if (transfer.status === TRANSFER_STATES.APPROVED) return [TRANSFER_STATES.IN_TRANSIT, "Dispatch"];
    if (transfer.status === TRANSFER_STATES.IN_TRANSIT) return [TRANSFER_STATES.RECEIVED, "Receive"];
    return null;
  };

  return (
    <Page
      eyebrow={`${portal === "admin" ? "Business" : "Retail operations"} / Inventory`}
      title="Transfer Stock"
      description="Move stock between store and warehouse locations through approval, transit and receipt. Destination stock never changes early."
      actions={<AtelierButton as={Link} to={root} variant="outline" size="chip">Back to inventory</AtelierButton>}
    >
      <InventoryNav portal={portal} />

      {feedback ? (
        <p role={feedback.kind === "error" ? "alert" : "status"} className={`mb-6 border p-4 font-ui text-sm ${feedback.kind === "error" ? "border-accent/40 bg-accent/[0.05] text-accent" : "border-cocoa/25 bg-cocoa/[0.05] text-cocoa"}`}>
          {feedback.message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
        <AdminPanel eyebrow="New transfer" title="Transfer request">
          <form onSubmit={(event) => { event.preventDefault(); create(false); }} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className={labelClass}>
                Source <span className="text-accent">*</span>
                <select required className={fieldClass} value={form.sourceLocationId} onChange={(event) => setForm((current) => ({ ...current, sourceLocationId: event.target.value }))}>
                  <option value="">Select source</option>
                  {inventory.locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.type}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Destination <span className="text-accent">*</span>
                <select required className={fieldClass} value={form.destinationLocationId} onChange={(event) => setForm((current) => ({ ...current, destinationLocationId: event.target.value }))}>
                  <option value="">Select destination</option>
                  {inventory.locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.type}</option>)}
                </select>
              </label>
              <label className={`${labelClass} sm:col-span-2 xl:col-span-1 2xl:col-span-2`}>
                Product <span className="text-accent">*</span>
                <select required className={fieldClass} value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value, variantId: "" }))}>
                  <option value="">Select catalogue product</option>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Variant
                <select className={fieldClass} disabled={!variants.length} value={form.variantId} onChange={(event) => setForm((current) => ({ ...current, variantId: event.target.value }))}>
                  <option value="">{variants.length ? "Choose active variant" : "Product-level stock"}</option>
                  {variants.map((variant) => <option key={variant.id} value={variant.id}>{[variant.color, variant.size].filter(Boolean).join(" / ")} · {variant.sku || "No SKU"}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Quantity <span className="text-accent">*</span>
                <input required min="1" step="1" type="number" className={fieldClass} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
              </label>
              <label className={`${labelClass} sm:col-span-2 xl:col-span-1 2xl:col-span-2`}>
                Reason
                <select className={fieldClass} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}>
                  {["Store replenishment", "Warehouse rebalancing", "Customer request", "Department event", "Other"].map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </label>
              <label className={`${labelClass} sm:col-span-2 xl:col-span-1 2xl:col-span-2`}>
                Notes
                <textarea className="mt-2 min-h-20 w-full border border-mist bg-canvas p-3 font-ui text-sm text-ink outline-none focus:border-accent" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            {warehouseStaff && form.sourceLocationId && form.destinationLocationId && !transferTouchesWarehouse ? (
              <p role="alert" className="font-ui text-xs text-accent">Warehouse staff transfers must include a warehouse location.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <AtelierButton type="submit" disabled={!ready}><Truck size={13} aria-hidden="true" /> Request transfer</AtelierButton>
              <AtelierButton type="button" variant="outline" disabled={!ready} onClick={() => create(true)}>Save draft</AtelierButton>
            </div>
          </form>

          <div className="mt-6 border-l-2 border-brass bg-canvas p-4">
            <p className="font-ui text-[10px] uppercase tracking-[.15em] text-taupe">Available for a new request</p>
            <p className="mt-1 font-display text-3xl text-ink">{requestableAtSource}</p>
            {pendingOutbound > 0 ? <p className="mt-1 font-ui text-[10px] text-taupe">{pendingOutbound} committed to pending transfers</p> : null}
            <div className="mt-4 flex items-center gap-3 font-ui text-xs text-taupe">
              <span>{sourceRecord ? Math.max(0, sourceRecord.quantity.onHand - quantity) : 0} source after dispatch</span>
              <ArrowRight size={13} aria-hidden="true" />
              <span>{(destinationRecord?.quantity.onHand || 0) + quantity} destination after receipt</span>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Transfer ledger" title="Requests & handling" bodyClassName="px-0 py-0 sm:px-0">
          <DataTable
            className="border-0"
            rows={visibleTransfers}
            empty="No transfers have been requested."
            columns={[
              { id: "id", label: "Reference", render: (row) => <div><p className="font-mono text-xs">{row.id}</p><p className="mt-1 text-[10px] text-taupe">{formatEmployeeDateTime(row.createdAt)}</p></div> },
              { id: "product", label: "Product", render: (row) => <div className="min-w-40"><p>{row.productName}</p><p className="mt-1 text-[10px] text-taupe">{row.variantLabel} · {row.quantity} units</p></div> },
              { id: "route", label: "Route", render: (row) => <div className="min-w-32"><p>{row.source?.name || "—"}</p><p className="my-1 text-[10px] text-brass">↓ to</p><p>{row.destination?.name || "—"}</p></div> },
              { id: "status", label: "Status", render: (row) => <InventoryStatusBadge status={row.status} kind="transfer" /> },
              { id: "requestedBy", label: "Requested by", render: (row) => <span className="text-[11px] text-taupe">{row.requestedBy}</span> },
              {
                id: "actions",
                label: "Action",
                render: (row) => {
                  const action = nextAction(row);
                  const cancellable = [TRANSFER_STATES.DRAFT, TRANSFER_STATES.REQUESTED, TRANSFER_STATES.APPROVED].includes(row.status);
                  return action || cancellable ? (
                    <div className="flex flex-col gap-1.5">
                      {action ? <AtelierButton size="chip" variant="outline" onClick={() => progress(row, action[0])}>{action[1]}</AtelierButton> : <span className="text-[11px] text-taupe">Awaiting manager</span>}
                      {cancellable ? <button type="button" onClick={() => progress(row, TRANSFER_STATES.CANCELLED)} className="font-ui text-[10px] text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Cancel</button> : null}
                    </div>
                  ) : row.status === TRANSFER_STATES.RECEIVED ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-cocoa"><CheckCircle2 size={12} aria-hidden="true" /> Complete</span>
                  ) : <span className="text-[11px] text-taupe">Awaiting next role</span>;
                },
              },
            ]}
          />
        </AdminPanel>
      </div>
    </Page>
  );
}
