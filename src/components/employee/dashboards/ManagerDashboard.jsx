import { useMemo } from "react";
import { useEmployeeAuth } from "../../../context/EmployeeAuthContext";
import { useEmployeeManagement } from "../../../context/EmployeeManagementContext";
import { useWorkforce } from "../../../context/WorkforceContext";
import { todayHouseSummary } from "../../../services/workforce/attendanceService";
import { housePerformanceSummary } from "../../../services/workforce/performanceService";
import { pendingLeaveCount } from "../../../services/workforce/leaveService";
import { getRoleLabel } from "../../../config/employeeRoles";
import { getDepartmentLabel } from "../../../config/employeeDepartments";
import { getAssistedOrders } from "../../../services/employees/operationsService";
import { useInventory } from "../../../context/InventoryContext";
import { formatINR } from "../../../utils/shopping";
import DataTable from "../DataTable";
import FutureNote from "../FutureNote";
import StatusBadge from "../StatusBadge";
import DashboardFrame from "./DashboardFrame";
import { employeeFullName } from "../../../utils/employee";

export default function ManagerDashboard() {
  const { employee } = useEmployeeAuth();
  const { revision } = useWorkforce();
  const { employees } = useEmployeeManagement();
  const team = employees;
  const floor = getAssistedOrders().slice(0, 5);
  const inventory = useInventory();
  const attendance = useMemo(() => todayHouseSummary(employee), [employee, revision]);
  const performance = useMemo(() => housePerformanceSummary(employee), [employee, revision]);
  const leavePending = useMemo(() => pendingLeaveCount(employee), [employee, revision]);
  const metrics = {
    primary: [
      { label: "Team present", value: String(attendance.presentToday || 0), hint: "Checked in today" },
      { label: "Team late", value: String(attendance.lateToday || 0), hint: "After the house threshold" },
      { label: "Team on leave", value: String(attendance.onLeave || 0), hint: `${leavePending} leave requests waiting` },
      { label: "Team achievement", value: `${performance.averageAchievement || 0}%`, hint: `${performance.pending} reviews pending` },
    ],
  };

  return (
    <DashboardFrame metrics={metrics} description="Sales, orders, customers and the team on the floor. Credentials and global people administration stay with Super Admin.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Floor tickets</h2>
          <DataTable
            rows={floor}
            columns={[
              { id: "id", label: "Ticket" },
              { id: "associate", label: "Associate" },
              { id: "customer", label: "Customer" },
              { id: "amount", label: "Amount", render: (row) => formatINR(row.amount) },
              { id: "status", label: "Status" },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Assigned team</h2>
          <DataTable
            rows={team.slice(0, 8)}
            columns={[
              { id: "name", label: "Name", render: (row) => employeeFullName(row) },
              { id: "role", label: "Role", render: (row) => getRoleLabel(row.role) },
              { id: "department", label: "Department", render: (row) => getDepartmentLabel(row.department) },
              { id: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </section>
      </div>
      <p className="mt-6 font-ui text-xs text-taupe">
        Store stock: {inventory.metrics.storeStock || 0} units · {inventory.metrics.lowStock || 0} low-stock rows · {inventory.metrics.pendingTransfers || 0} pending transfers.
      </p>
      <div className="mt-4">
        <FutureNote title="Later · AI sales insights">
          Store reports will later surface unusual movement from the same sales and stock figures. No insight engine is running in this preview.
        </FutureNote>
      </div>
    </DashboardFrame>
  );
}
