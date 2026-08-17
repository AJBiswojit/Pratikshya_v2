import { Link } from "react-router-dom";
import { useInventory } from "../../../context/InventoryContext";
import DataTable from "../DataTable";
import DashboardFrame from "./DashboardFrame";

export default function WarehouseDashboard() {
  const inventory = useInventory();
  const warehouseRows = inventory.records.filter((row) => row.location?.type === "WAREHOUSE");
  const warehouseUnits = warehouseRows.reduce((sum, row) => sum + row.quantity.onHand, 0);
  const warehouseDamaged = warehouseRows.reduce((sum, row) => sum + row.quantity.damaged, 0);
  const incoming = inventory.transfers.filter((transfer) => transfer.destination?.type === "WAREHOUSE" && transfer.status !== "RECEIVED" && transfer.status !== "CANCELLED");
  const outgoing = inventory.transfers.filter((transfer) => transfer.source?.type === "WAREHOUSE" && transfer.status !== "RECEIVED" && transfer.status !== "CANCELLED");
  const metrics = {
    primary: [
      { label: "Warehouse units", value: String(warehouseUnits), hint: "On hand" },
      { label: "Pending receipts", value: String(incoming.length), hint: "Transfers inbound" },
      { label: "Transfers", value: String(outgoing.length), hint: "Open outbound" },
      { label: "Damaged", value: String(warehouseDamaged), hint: "Quarantined" },
    ],
  };

  return (
    <DashboardFrame metrics={metrics} description="Warehouse stock, incoming receipts, transfer dispatch and quarantined pieces — all from the central inventory ledger.">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/employee/inventory" className="border border-ink bg-ink px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ivory">Warehouse inventory</Link>
        <Link to="/employee/inventory/receive" className="border border-pearl px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:border-ink">Receive stock</Link>
        <Link to="/employee/inventory/transfers" className="border border-pearl px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:border-ink">Handle transfers</Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Incoming transfers</h2>
          <DataTable
            rows={incoming}
            empty="No warehouse receipts are pending."
            columns={[
              { id: "id", label: "Ref" },
              { id: "productName", label: "Piece" },
              { id: "quantity", label: "Qty" },
              { id: "status", label: "Status", render: (row) => row.status.replaceAll("_", " ") },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Outgoing transfers</h2>
          <DataTable
            rows={outgoing}
            empty="No warehouse dispatches are pending."
            columns={[
              { id: "id", label: "Ref" },
              { id: "productName", label: "Piece" },
              { id: "quantity", label: "Qty" },
              { id: "status", label: "Status", render: (row) => row.status.replaceAll("_", " ") },
            ]}
          />
        </section>
      </div>
    </DashboardFrame>
  );
}
