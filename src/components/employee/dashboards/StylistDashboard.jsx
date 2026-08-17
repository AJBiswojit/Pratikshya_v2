import {
  getAppointments,
  getStylingRequests,
} from "../../../services/employees/operationsService";
import DataTable from "../DataTable";
import FutureNote from "../FutureNote";
import DashboardFrame from "./DashboardFrame";

export default function StylistDashboard() {
  const requests = getStylingRequests();
  const appointments = getAppointments().filter((item) => item.type !== "Groom fitting");

  return (
    <DashboardFrame description="Consultations, appointments and the bridal book. This desk is where later AI styling will sit — quietly, on structured customer and product data.">
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Today's appointments</h2>
          <DataTable
            rows={appointments}
            columns={[
              { id: "when", label: "When" },
              { id: "customer", label: "Customer" },
              { id: "type", label: "Sitting" },
              { id: "room", label: "Room" },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Styling requests</h2>
          <DataTable
            rows={requests}
            columns={[
              { id: "id", label: "Request" },
              { id: "customer", label: "Customer" },
              { id: "occasion", label: "Occasion" },
              { id: "status", label: "Status" },
              { id: "when", label: "When" },
            ]}
          />
        </section>
      </div>
      <div className="mt-6">
        <FutureNote title="Later · AI styling assistant">
          Bridal and trousseau recommendations will later read the same customer profiles and catalogue. This preview keeps the surface ready and the assistant off.
        </FutureNote>
      </div>
    </DashboardFrame>
  );
}
