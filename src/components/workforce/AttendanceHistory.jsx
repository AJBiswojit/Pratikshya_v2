import { useMemo, useState } from "react";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import DataTable from "../employee/DataTable";
import { ATTENDANCE_STATUS_OPTIONS } from "../../config/attendanceConfig";
import { filterEmployeeHistory } from "../../services/workforce/attendanceService";
import { formatDateShort, formatMinutes, formatTime, monthOptions } from "../../services/workforce/dateUtils";
import { AttendanceStatusBadge } from "./WorkforceBadges";

export default function AttendanceHistory({ employeeId, month: monthProp, onMonthChange }) {
  const [month, setMonth] = useState(monthProp || monthOptions(6)[0].id);
  const [status, setStatus] = useState("");
  const rows = useMemo(
    () => filterEmployeeHistory(employeeId, { month, status }),
    [employeeId, month, status]
  );

  const changeMonth = (value) => {
    setMonth(value);
    onMonthChange?.(value);
  };

  return (
    <section>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <EmployeeField label="Month" id="att-history-month">
          <select
            id="att-history-month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
            className={employeeInputClass()}
          >
            {monthOptions(8).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
        <EmployeeField label="Status" id="att-history-status">
          <select
            id="att-history-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={employeeInputClass()}
          >
            <option value="">All statuses</option>
            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      </div>

      <DataTable
        rows={rows}
        rowKey="attendanceId"
        empty="No attendance recorded for this month."
        columns={[
          { id: "date", label: "Date", render: (row) => formatDateShort(row.date) },
          { id: "checkIn", label: "Check-in", render: (row) => formatTime(row.checkIn) },
          { id: "checkOut", label: "Check-out", render: (row) => formatTime(row.checkOut) },
          { id: "hours", label: "Hours", render: (row) => (row.workMinutes ? formatMinutes(row.workMinutes) : "—") },
          { id: "status", label: "Status", render: (row) => <AttendanceStatusBadge status={row.status} /> },
        ]}
      />
    </section>
  );
}
