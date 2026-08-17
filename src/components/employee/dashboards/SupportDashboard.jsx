import { getFeedback, getSupportCases } from "../../../services/employees/operationsService";
import DataTable from "../DataTable";
import FutureNote from "../FutureNote";
import DashboardFrame from "./DashboardFrame";

export default function SupportDashboard() {
  const cases = getSupportCases();
  const feedback = getFeedback();

  return (
    <DashboardFrame description="Customers, orders and returns — the care desk for the house. Inventory and people administration stay elsewhere.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Support cases</h2>
          <DataTable
            rows={cases}
            columns={[
              { id: "id", label: "Case" },
              { id: "customer", label: "Customer" },
              { id: "topic", label: "Topic" },
              { id: "status", label: "Status" },
              { id: "priority", label: "Queue" },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Recent feedback</h2>
          <ul className="divide-y divide-mist/70 border border-mist/80 bg-surface/30">
            {feedback.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="font-ui text-sm text-ink">
                  {item.customer} · {item.score}/5
                </p>
                <p className="mt-1 font-ui text-xs leading-relaxed text-taupe">{item.note}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <FutureNote title="Later · AI customer assistance">
              Care notes will later draft from the same order and return records. No assistant is running here.
            </FutureNote>
          </div>
        </section>
      </div>
    </DashboardFrame>
  );
}
