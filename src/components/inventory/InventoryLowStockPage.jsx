import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { STOCK_STATUS } from "../../services/inventory/inventoryRepository";

export default function InventoryLowStockPage({ portal = "admin" }) {
  const inventory = useInventory();
  const { admin } = useAdminAuth();
  const { employee, hasPermission } = useEmployeeAuth();
  const [thresholds, setThresholds] = useState({});
  const [feedback, setFeedback] = useState("");
  const [showOut, setShowOut] = useState(true);
  const Page = portal === "admin" ? AdminPage : EmployeePage;
  const root = portal === "admin" ? "/admin/inventory" : "/employee/inventory";
  const actor = portal === "admin" ? { adminId: admin?.adminId, name: admin?.name || "Administrator" } : employee;
  const warehouseOnly = portal === "employee" && employee?.role === ROLES.WAREHOUSE_STAFF;
  const availabilityOnly = portal === "employee" && [ROLES.SALES_EXECUTIVE, ROLES.FASHION_STYLIST, ROLES.CUSTOMER_SUPPORT].includes(employee?.role);
  const canReceive = portal === "admin" || hasPermission(PERMISSIONS.INVENTORY_RECEIVE);
  const canTransfer = portal === "admin" || hasPermission(PERMISSIONS.INVENTORY_TRANSFER);
  const canManage = portal === "admin" || hasPermission(PERMISSIONS.INVENTORY_MANAGE);

  const rows = useMemo(() => inventory.records.filter((row) =>
    [STOCK_STATUS.LOW_STOCK, STOCK_STATUS.OUT_OF_STOCK].includes(row.status) &&
    (showOut || row.status !== STOCK_STATUS.OUT_OF_STOCK) &&
    (!warehouseOnly || row.location?.type === "WAREHOUSE")
  ), [inventory.records, warehouseOnly, showOut]);

  const saveThreshold = (row) => {
    const result = inventory.updateThreshold({
      inventoryId: row.id,
      threshold: thresholds[row.id] ?? row.lowStockThreshold,
      actor,
    });
    setFeedback(result.ok ? `Threshold updated for ${row.productName}.` : result.error);
  };

  if (availabilityOnly) {
    return (
      <Page
        eyebrow="Retail operations / Availability"
        title="Availability Access"
        description="Your role can share customer-safe availability, but internal thresholds, locations and unit counts remain restricted."
        actions={<AtelierButton as={Link} to={root} size="chip">Open availability</AtelierButton>}
      >
        <InventoryNav portal={portal} />
        <AdminPanel eyebrow="Permission boundary" title="Stock alerts are operational">
          <p className="font-ui text-sm leading-relaxed text-taupe">
            Ask a Store Manager or Inventory Manager to review low-stock actions. Product availability remains visible on your Inventory page.
          </p>
        </AdminPanel>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={`${portal === "admin" ? "Business" : "Retail operations"} / Inventory`}
      title="Low & Out of Stock"
      description="Prioritised stock alerts calculated centrally from available units and each product's existing low-stock threshold."
      actions={<AtelierButton as={Link} to={root} variant="outline" size="chip">Back to inventory</AtelierButton>}
    >
      <InventoryNav portal={portal} />
      {feedback ? <p role="status" className="mb-5 border border-mist bg-canvas p-3 font-ui text-sm text-ink">{feedback}</p> : null}
      <AdminPanel
        eyebrow="Action queue"
        title={`${rows.length} stock alert${rows.length === 1 ? "" : "s"}`}
        bodyClassName="px-0 py-0 sm:px-0"
        action={
          <label className="inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.13em] text-taupe">
            <input type="checkbox" checked={showOut} onChange={(event) => setShowOut(event.target.checked)} className="accent-[var(--color-accent)]" />
            Include out of stock
          </label>
        }
      >
        <DataTable
          className="border-0"
          rows={rows}
          empty="No visible products are low or out of stock."
          columns={[
            { id: "product", label: "Product", render: (row) => <div className="min-w-40"><p>{row.productName}</p><p className="mt-1 font-mono text-[10px] text-taupe">{row.sku} · {row.variantLabel}</p></div> },
            { id: "location", label: "Location", render: (row) => <div><p>{row.location?.name}</p><p className="mt-1 text-[10px] text-taupe">{row.placementLabel}</p></div> },
            { id: "available", label: "Available", render: (row) => <strong className="text-accent">{row.quantity.available}</strong> },
            { id: "threshold", label: "Threshold", render: (row) => row.lowStockThreshold },
            { id: "status", label: "Status", render: (row) => <InventoryStatusBadge status={row.status} /> },
            { id: "recommended", label: "Recommended action", render: (row) => row.status === STOCK_STATUS.OUT_OF_STOCK ? "Receive or transfer immediately" : row.location?.type === "STORE" ? "Transfer from warehouse" : "Receive supplier stock" },
            {
              id: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex min-w-36 flex-col gap-1.5">
                  {canReceive ? <Link to={`${root}/receive?productId=${encodeURIComponent(row.productId)}&locationId=${encodeURIComponent(row.locationId)}`} className="text-[11px] text-brass hover:text-accent">Receive stock</Link> : null}
                  {canTransfer ? <Link to={`${root}/transfers?inventoryId=${encodeURIComponent(row.id)}`} className="text-[11px] text-brass hover:text-accent">Transfer stock</Link> : null}
                  {canManage ? (
                    <div className="mt-1 flex items-center gap-1">
                      <label className="sr-only" htmlFor={`threshold-${row.id}`}>Threshold for {row.productName}</label>
                      <input id={`threshold-${row.id}`} type="number" min="0" className="h-8 w-14 border border-mist bg-canvas px-2 text-xs outline-none focus:border-accent" value={thresholds[row.id] ?? row.lowStockThreshold} onChange={(event) => setThresholds((current) => ({ ...current, [row.id]: event.target.value }))} />
                      <button type="button" onClick={() => saveThreshold(row)} className="h-8 border border-mist px-2 font-ui text-[9px] uppercase tracking-wider text-ink hover:border-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Save</button>
                    </div>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </AdminPanel>
    </Page>
  );
}
