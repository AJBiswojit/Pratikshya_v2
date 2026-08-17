import { Link } from "react-router-dom";
import { useInventory } from "../../../context/InventoryContext";
import { useEmployeeAuth } from "../../../context/EmployeeAuthContext";
import { ROLES } from "../../../config/employeeRoles";
import { formatEmployeeDateTime } from "../../../utils/employee";
import DataTable from "../DataTable";
import DashboardFrame from "./DashboardFrame";

export default function InventoryDashboard() {
  const { employee } = useEmployeeAuth();
  const inventory = useInventory();
  const isManager = employee?.role === ROLES.INVENTORY_MANAGER;
  const metrics = {
    primary: [
      { label: "Total units", value: String(inventory.metrics.totalUnits || 0), hint: "On hand" },
      { label: "Low stock", value: String(inventory.metrics.lowStock || 0), hint: "Needs action" },
      { label: "Out of stock", value: String(inventory.metrics.outOfStock || 0), hint: "Unavailable" },
      { label: "Pending transfers", value: String(inventory.metrics.pendingTransfers || 0), hint: "Open workflow" },
    ],
  };

  return (
    <DashboardFrame
      metrics={metrics}
      description={isManager
        ? "Stock health across the house — receiving, adjustments, transfers and the pieces running low."
        : "Today's stock desk. Receive, adjust and raise transfer requests within your permissions."}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/employee/inventory" className="border border-ink bg-ink px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ivory">Open inventory</Link>
        <Link to="/employee/inventory/low-stock" className="border border-pearl px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:border-ink">Low stock · {inventory.metrics.lowStock || 0}</Link>
        <Link to="/employee/inventory/receive" className="border border-pearl px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:border-ink">Receive stock</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Recent stock movements</h2>
          <DataTable
            rows={inventory.movements.slice(0, 5)}
            columns={[
              { id: "type", label: "Type", render: (row) => row.type.replaceAll("_", " ") },
              { id: "productName", label: "Piece" },
              { id: "quantity", label: "Qty", render: (row) => `${row.quantity > 0 ? "+" : ""}${row.quantity}` },
              { id: "location", label: "Location", render: (row) => row.location?.name || "—" },
              { id: "timestamp", label: "When", render: (row) => formatEmployeeDateTime(row.timestamp) },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Transfer queue</h2>
          <DataTable
            rows={inventory.transfers.slice(0, 5)}
            columns={[
              { id: "id", label: "Ref" },
              { id: "productName", label: "Piece" },
              { id: "source", label: "From", render: (row) => row.source?.name || "—" },
              { id: "destination", label: "To", render: (row) => row.destination?.name || "—" },
              { id: "status", label: "Status", render: (row) => row.status.replaceAll("_", " ") },
            ]}
          />
        </section>
      </div>
    </DashboardFrame>
  );
}
