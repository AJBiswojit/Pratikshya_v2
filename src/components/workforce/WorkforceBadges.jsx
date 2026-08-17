import { getAttendanceStatus, getLeaveStatus } from "../../config/attendanceConfig";
import { getPerformanceStatus } from "../../config/performanceConfig";
import StatusBadge from "../employee/StatusBadge";

export function AttendanceStatusBadge({ status, className = "" }) {
  const definition = getAttendanceStatus(status);
  return <StatusBadge label={definition.label} tone={definition.tone} className={className} />;
}

export function LeaveStatusBadge({ status, className = "" }) {
  const definition = getLeaveStatus(status);
  return <StatusBadge label={definition.label} tone={definition.tone} className={className} />;
}

export function PerformanceStatusBadge({ status, className = "" }) {
  const definition = getPerformanceStatus(status);
  return <StatusBadge label={definition.label} tone={definition.tone} className={className} />;
}

export default AttendanceStatusBadge;
