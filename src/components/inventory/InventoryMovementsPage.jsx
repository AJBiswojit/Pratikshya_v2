import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import AdminPage from "../admin/AdminPage";
import AdminPanel from "../admin/AdminPanel";
import EmployeePage from "../employee/EmployeePage";
import DataTable from "../employee/DataTable";
import { AtelierButton } from "../../design-system";
import InventoryNav from "./InventoryNav";
import { useInventory } from "../../context/InventoryContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { ROLES } from "../../config/employeeRoles";
import { formatEmployeeDateTime } from "../../utils/employee";

const fieldClass = "mt-2 h-10 w-full border border-mist bg-canvas px-3 font-ui text-xs text-ink outline-none focus:border-accent";

const quantityText = (movement) => `${movement.quantity > 0 ? "+" : ""}${movement.quantity}`;

export default function InventoryMovementsPage({ portal = "admin" }) {
  const inventory = useInventory();
  const { employee } = useEmployeeAuth();
  const [filters, setFilters] = useState({ search: "", type: "", locationId: "" });
  const [selected, setSelected] = useState(null);
  const Page = portal === "admin" ? AdminPage : EmployeePage;
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const warehouseOnly = portal === "employee" && employee?.role === ROLES.WAREHOUSE_STAFF;
  const locations = inventory.locations.filter((location) => !warehouseOnly || location.type === "WAREHOUSE");
  const scopedMovements = inventory.movements.filter((movement) =>
    !warehouseOnly || movement.location?.type === "WAREHOUSE"
  );
  const types = [...new Set(scopedMovements.map((movement) => movement.type))].sort();

  const movements = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return scopedMovements.filter((movement) => {
      const haystack = [movement.productName, movement.product?.sku, movement.variantLabel, movement.reference, movement.reason, movement.employeeName]
        .join(" ").toLowerCase();
      return (!term || haystack.includes(term)) &&
        (!filters.type || movement.type === filters.type) &&
        (!filters.locationId || movement.locationId === filters.locationId);
    });
  }, [inventory.movements, filters, warehouseOnly]);

  return (
    <Page
      eyebrow={`${portal === "admin" ? "Business" : "Retail operations"} / Inventory`}
      title="Stock Movement History"
      description="The dedicated quantity ledger for receiving, adjustments, transfers, reservations, sales, returns and damage."
      actions={<AtelierButton as={Link} to={root} variant="outline" size="chip">Back to inventory</AtelierButton>}
    >
      <InventoryNav portal={portal} />
      <AdminPanel eyebrow="Inventory audit" title="Movement ledger" bodyClassName="px-0 py-0 sm:px-0">
        <form className="grid gap-3 border-b border-mist/70 bg-canvas/60 p-4 sm:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Search
            <input type="search" className={fieldClass} placeholder="Product, SKU, employee or reference" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </label>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Movement type
            <select className={fieldClass} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All movements</option>
              {types.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            Location
            <select className={fieldClass} value={filters.locationId} onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">All locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
        </form>
        <DataTable
          className="border-0"
          rows={movements}
          empty="No movement records match these filters."
          columns={[
            { id: "date", label: "Date", render: (row) => <span className="whitespace-nowrap text-[11px] text-taupe">{formatEmployeeDateTime(row.timestamp)}</span> },
            { id: "product", label: "Product", render: (row) => <div className="min-w-40"><p>{row.productName}</p><p className="mt-1 font-mono text-[10px] text-taupe">{row.product?.sku || "—"} · {row.variantLabel}</p></div> },
            { id: "location", label: "Location", render: (row) => row.location?.name || "—" },
            { id: "type", label: "Movement", render: (row) => <span className="border border-mist bg-canvas px-2 py-1 text-[9px] uppercase tracking-[.12em]">{row.type.replaceAll("_", " ")}</span> },
            { id: "quantity", label: "Quantity", render: (row) => <strong className={row.quantity < 0 ? "text-accent" : "text-cocoa"}>{quantityText(row)}</strong> },
            { id: "employee", label: "Employee", render: (row) => <span className="text-[11px] text-taupe">{row.employeeName || "System"}</span> },
            { id: "reference", label: "Reference", render: (row) => <div><p className="font-mono text-[10px]">{row.reference || "—"}</p><p className="mt-1 max-w-44 text-[10px] text-taupe">{row.reason || "—"}</p></div> },
            { id: "action", label: "Detail", render: (row) => <button type="button" onClick={() => setSelected(row)} className="font-ui text-[11px] text-brass underline-offset-4 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">View</button> },
          ]}
        />
        <p className="border-t border-mist/60 px-5 py-3 font-ui text-[10px] text-taupe">{movements.length} movement{movements.length === 1 ? "" : "s"} shown · newest first</p>
      </AdminPanel>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="movement-title" onKeyDown={(event) => { if (event.key === "Escape") setSelected(null); }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-mist bg-ivory p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Movement detail</p>
                <h2 id="movement-title" className="mt-2 font-display text-3xl font-light text-ink">{selected.type.replaceAll("_", " ")}</h2>
                <p className="mt-2 font-ui text-sm text-taupe">{selected.productName} · {selected.variantLabel}</p>
              </div>
              <button autoFocus type="button" aria-label="Close movement detail" onClick={() => setSelected(null)} className="p-2 text-taupe hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"><X size={18} /></button>
            </div>
            <dl className="mt-7 grid gap-x-6 gap-y-5 border-y border-mist/70 py-6 sm:grid-cols-2">
              {[
                ["Location", selected.location?.name || "—"],
                ["Quantity", quantityText(selected)],
                ["Before available", selected.before?.available ?? "—"],
                ["After available", selected.after?.available ?? "—"],
                ["Before on hand", selected.before?.onHand ?? "—"],
                ["After on hand", selected.after?.onHand ?? "—"],
                ["Reserved", `${selected.before?.reserved ?? "—"} → ${selected.after?.reserved ?? "—"}`],
                ["Sold", `${selected.before?.sold ?? "—"} → ${selected.after?.sold ?? "—"}`],
                ["Returned", `${selected.before?.returned ?? "—"} → ${selected.after?.returned ?? "—"}`],
                ["Damaged", `${selected.before?.damaged ?? "—"} → ${selected.after?.damaged ?? "—"}`],
                ["Employee", selected.employeeName || "System"],
                ["Date", formatEmployeeDateTime(selected.timestamp)],
                ["Reference", selected.reference || "—"],
                ["Reason", selected.reason || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-ui text-[9px] uppercase tracking-[.15em] text-taupe">{label}</dt>
                  <dd className="mt-1 font-ui text-sm text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.notes ? <p className="mt-5 font-ui text-xs leading-relaxed text-taupe">Notes: {selected.notes}</p> : null}
            <AtelierButton className="mt-6" variant="outline" onClick={() => setSelected(null)}>Close</AtelierButton>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
