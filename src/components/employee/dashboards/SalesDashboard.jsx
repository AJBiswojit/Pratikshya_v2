import { Link } from "react-router-dom";
import { useEmployeeAuth } from "../../../context/EmployeeAuthContext";
import {
  getAssistedOrders,
  getFollowUps,
  getOffers,
} from "../../../services/employees/operationsService";
import { formatINR } from "../../../utils/shopping";
import { formatEmployeeDateTime } from "../../../utils/employee";
import DataTable from "../DataTable";
import FutureNote from "../FutureNote";
import DashboardFrame from "./DashboardFrame";

export default function SalesDashboard() {
  const { employee } = useEmployeeAuth();
  const orders = getAssistedOrders(employee?.employeeId).slice(0, 4);
  const followUps = getFollowUps(employee?.employeeId);
  const offers = getOffers().filter((offer) => offer.status === "Live");

  return (
    <DashboardFrame
      description={`${employee?.firstName}, today's floor is Women's Sarees and the pieces beside them. Assisted orders, follow-ups and live offers sit here.`}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl font-light text-ink">Orders assisted</h2>
            <Link to="/employee/orders" className="font-ui text-[11px] uppercase tracking-[.14em] text-brass hover:text-accent">
              All orders
            </Link>
          </div>
          <DataTable
            rows={orders}
            columns={[
              { id: "id", label: "Ticket" },
              { id: "customer", label: "Customer" },
              { id: "pieces", label: "Pieces" },
              { id: "amount", label: "Amount", render: (row) => formatINR(row.amount) },
              { id: "status", label: "Status" },
              {
                id: "createdAt",
                label: "When",
                render: (row) => formatEmployeeDateTime(row.createdAt),
              },
            ]}
            empty="No assisted orders on this desk yet."
          />
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-2xl font-light text-ink">Pending follow-ups</h2>
            <ul className="divide-y divide-mist/70 border border-mist/80 bg-surface/30">
              {followUps.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="font-ui text-sm text-ink">{item.customer}</p>
                  <p className="mt-0.5 font-ui text-xs text-taupe">{item.note}</p>
                  <p className="mt-1 font-ui text-[11px] text-brass">{item.when}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-display text-2xl font-light text-ink">Live offers</h2>
            <ul className="space-y-2">
              {offers.map((offer) => (
                <li key={offer.id} className="border border-mist/80 bg-canvas px-4 py-3">
                  <p className="font-ui text-sm text-ink">{offer.name}</p>
                  <p className="font-ui text-xs text-taupe">{offer.value} · {offer.applies}</p>
                </li>
              ))}
            </ul>
          </section>
          <FutureNote title="Later · AI product recommendation">
            This desk will later suggest pairings from live stock. No assistant is running in this preview.
          </FutureNote>
        </div>
      </div>
    </DashboardFrame>
  );
}
