import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AtelierButton } from "../../design-system";
import EmployeePage from "../../components/employee/EmployeePage";
import CheckInCard from "../../components/workforce/CheckInCard";
import AttendanceSummary from "../../components/workforce/AttendanceSummary";
import AttendanceHistory from "../../components/workforce/AttendanceHistory";
import DataTable from "../../components/employee/DataTable";
import { AttendanceStatusBadge } from "../../components/workforce/WorkforceBadges";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useWorkforce } from "../../context/WorkforceContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { listVisibleAttendance } from "../../services/workforce/attendanceService";
import { formatMinutes, formatTime, monthKey, todayKey } from "../../services/workforce/dateUtils";

export default function EmployeeAttendance() {
  const { employee, hasPermission } = useEmployeeAuth();
  const { revision } = useWorkforce();
  const [month, setMonth] = useState(monthKey());
  const canManage = hasPermission(PERMISSIONS.ATTENDANCE_MANAGE);
  const team = useMemo(
    () => (canManage ? listVisibleAttendance(employee, { date: todayKey() }) : []),
    [canManage, employee, revision]
  );

  if (!employee) return null;

  return (
    <EmployeePage
      eyebrow="Presence"
      title={
        <>
          Attendance on the <span className="italic text-accent">floor.</span>
        </>
      }
      description="Check in and out, read the month, and request leave. Working hours are the house day — 9:30 AM to 6:30 PM — not a biometric clock."
      actions={
        hasPermission(PERMISSIONS.LEAVE_VIEW) ? (
          <AtelierButton as={Link} to="/employee/attendance/leave" variant="outline" size="chip">
            Leave
          </AtelierButton>
        ) : null
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <CheckInCard />
        <AttendanceSummary employeeId={employee.employeeId} month={month} compact />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-light text-ink">History</h2>
        <AttendanceHistory employeeId={employee.employeeId} month={month} onMonthChange={setMonth} />
      </section>

      {canManage ? (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-light text-ink">Team today</h2>
            <p className="font-ui text-[11px] text-taupe">{team.length} people in your scope</p>
          </div>
          <DataTable
            rows={team.filter((row) => row.employeeId !== employee.employeeId)}
            rowKey="employeeId"
            empty="No team attendance to show."
            columns={[
              { id: "name", label: "Employee" },
              { id: "employeeId", label: "ID" },
              { id: "roleLabel", label: "Role" },
              { id: "checkIn", label: "In", render: (row) => formatTime(row.checkIn) },
              { id: "checkOut", label: "Out", render: (row) => formatTime(row.checkOut) },
              { id: "hours", label: "Hours", render: (row) => (row.workMinutes ? formatMinutes(row.workMinutes) : "—") },
              { id: "status", label: "Status", render: (row) => <AttendanceStatusBadge status={row.status} /> },
            ]}
          />
        </section>
      ) : null}
    </EmployeePage>
  );
}
