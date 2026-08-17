import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserCheck, UserMinus, UsersRound } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import DataTable from "../../../components/employee/DataTable";
import EmployeeField, { employeeInputClass } from "../../../components/employee/EmployeeField";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import { useEmployeeManagement } from "../../../context/EmployeeManagementContext";
import { ROLE_OPTIONS, getRoleLabel } from "../../../config/employeeRoles";
import { DEPARTMENT_OPTIONS, getDepartmentLabel } from "../../../config/employeeDepartments";
import { STATUS_OPTIONS, EMPLOYEE_STATUS, canEmployeeLogin } from "../../../config/employeeStatus";
import { getPermissionLabel } from "../../../config/employeePermissions";
import { employeeFullName, formatEmployeeDateTime } from "../../../utils/employee";

const Metric = ({ icon: Icon, label, value, detail }) => (
  <div className="border border-mist/80 bg-surface/40 px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <dt className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">{label}</dt>
        <dd className="mt-1 font-display text-3xl font-light text-ink">{value}</dd>
        <p className="mt-1 font-ui text-[11px] text-taupe">{detail}</p>
      </div>
      <span className="inline-flex h-9 w-9 items-center justify-center border border-mist bg-canvas text-accent">
        <Icon size={16} aria-hidden="true" />
      </span>
    </div>
  </div>
);

const accessIsBlocked = (person) =>
  [EMPLOYEE_STATUS.INACTIVE, EMPLOYEE_STATUS.SUSPENDED].includes(person.status);

const permissionSummary = (person) => {
  const permissions = Array.isArray(person.permissions) ? person.permissions : [];
  if (!permissions.length) return "No operational permissions";
  const labels = permissions.slice(0, 2).map(getPermissionLabel);
  const remaining = permissions.length - labels.length;
  return `${labels.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`;
};

export default function AdminEmployees() {
  const {
    employees,
    getEmployees,
    activateEmployee,
    deactivateEmployee,
  } = useEmployeeManagement();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const metrics = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((person) => person.status === EMPLOYEE_STATUS.ACTIVE).length,
      inactive: employees.filter((person) => !canEmployeeLogin(person.status)).length,
    }),
    [employees]
  );

  const rows = useMemo(
    () => getEmployees({ query, role, department, status }),
    [getEmployees, query, role, department, status]
  );

  const changeAccess = async (person) => {
    if (busyId) return;
    const activating = accessIsBlocked(person);
    setBusyId(person.employeeId);
    setNotice(null);
    const result = activating
      ? await activateEmployee(person.employeeId)
      : await deactivateEmployee(person.employeeId);
    setBusyId(null);
    setNotice(
      result.ok
        ? {
            ok: true,
            text: `${employeeFullName(person)} is now ${activating ? "active" : "inactive"}.`,
          }
        : { ok: false, text: result.message || "The account status could not be changed." }
    );
  };

  return (
    <AdminPage
      eyebrow="People / Organization"
      title={<>Employee <span className="italic text-accent">accounts.</span></>}
      description="Create and administer employee access. Attendance, performance and day-to-day operations remain in the Employee Portal."
      actions={
        <AtelierButton as={Link} to="/admin/employees/new" size="chip">
          Add employee
        </AtelierButton>
      }
    >
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 border px-4 py-3 font-ui text-sm ${notice.ok ? "border-cocoa/30 bg-cocoa/5 text-cocoa" : "border-accent/40 bg-accent/5 text-accent"}`}
        >
          {notice.text}
        </div>
      ) : null}

      <dl className="mb-7 grid gap-3 sm:grid-cols-3">
        <Metric icon={UsersRound} label="Employees" value={metrics.total} detail="Legitimate employee identities" />
        <Metric icon={UserCheck} label="Active" value={metrics.active} detail="Can access and receive work" />
        <Metric icon={UserMinus} label="Inactive" value={metrics.inactive} detail="Access disabled; history retained" />
      </dl>

      <AdminPanel eyebrow={`${rows.length} of ${employees.length} accounts`} title="Employee directory">
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EmployeeField label="Search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, ID, email or phone"
              className={employeeInputClass()}
            />
          </EmployeeField>
          <EmployeeField label="Role">
            <select value={role} onChange={(event) => setRole(event.target.value)} className={employeeInputClass()}>
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </EmployeeField>
          <EmployeeField label="Department / team">
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={employeeInputClass()}>
              <option value="">All departments</option>
              {DEPARTMENT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </EmployeeField>
          <EmployeeField label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={employeeInputClass()}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </EmployeeField>
        </div>

        <DataTable
          rows={rows}
          rowKey="employeeId"
          empty="No employee accounts match these filters."
          columns={[
            {
              id: "name",
              label: "Employee",
              render: (row) => (
                <div>
                  <Link to={`/admin/employees/${row.employeeId}`} className="font-medium text-ink hover:text-accent">
                    {employeeFullName(row)}
                  </Link>
                  <p className="mt-1 text-[11px] text-taupe">{row.employeeId} · {row.email}</p>
                </div>
              ),
            },
            { id: "role", label: "Role", render: (row) => getRoleLabel(row.role) },
            { id: "department", label: "Department", render: (row) => getDepartmentLabel(row.department) },
            { id: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { id: "permissions", label: "Permissions", render: permissionSummary },
            {
              id: "lastLogin",
              label: "Last activity",
              render: (row) => row.lastLogin ? formatEmployeeDateTime(row.lastLogin) : "Never signed in",
            },
            {
              id: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[12px]">
                  <Link to={`/admin/employees/${row.employeeId}`} className="text-brass hover:text-accent">View</Link>
                  <Link to={`/admin/employees/${row.employeeId}/edit`} className="text-brass hover:text-accent">Edit</Link>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => changeAccess(row)}
                    className="text-brass hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === row.employeeId
                      ? accessIsBlocked(row) ? "Activating…" : "Deactivating…"
                      : accessIsBlocked(row) ? "Activate" : "Deactivate"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AdminPanel>
    </AdminPage>
  );
}
