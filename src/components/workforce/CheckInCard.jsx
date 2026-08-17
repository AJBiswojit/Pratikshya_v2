import { useState } from "react";
import { AtelierButton, Rule } from "../../design-system";
import { ATTENDANCE_STATUS } from "../../config/attendanceConfig";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useWorkforce } from "../../context/WorkforceContext";
import { checkIn, checkOut, getTodayAttendance } from "../../services/workforce/attendanceService";
import { resolveEmployeeLocation } from "../../services/workforce/location";
import { formatMinutes, formatTime } from "../../services/workforce/dateUtils";
import { isEmployeeInactiveForOps } from "../../services/workforce/scope";
import { AttendanceStatusBadge } from "./WorkforceBadges";

export default function CheckInCard({ employee: employeeOverride = null, compact = false }) {
  const { employee: sessionEmployee, hasPermission } = useEmployeeAuth();
  const { revision } = useWorkforce();
  const employee = employeeOverride || sessionEmployee;
  const record = employee ? getTodayAttendance(employee.employeeId) : null;
  const location = employee ? resolveEmployeeLocation(employee) : null;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!employee || !record) return null;

  const blocked = isEmployeeInactiveForOps(employee);
  const canIn = hasPermission(PERMISSIONS.ATTENDANCE_CHECKIN) && !blocked;
  const canOut = hasPermission(PERMISSIONS.ATTENDANCE_CHECKOUT) && !blocked;
  const checkedIn = Boolean(record.checkIn);
  const checkedOut = Boolean(record.checkOut);
  const onLeave = record.status === ATTENDANCE_STATUS.LEAVE;

  const run = async (action) => {
    setBusy(true);
    const result = action === "in"
      ? checkIn({ employeeId: employee.employeeId, actor: sessionEmployee })
      : checkOut({ employeeId: employee.employeeId, actor: sessionEmployee });
    setBusy(false);
    setMessage(result.message || "");
  };

  void revision;

  return (
    <section className="border border-mist/80 bg-surface/40 p-6">
      <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Today's attendance</p>
      <h2 className="mt-2 font-display text-2xl font-light text-ink">
        {compact ? "On the floor" : "Check in for the floor"}
      </h2>
      <Rule width="w-8" tone="accent" className="my-3" />

      <div className="flex flex-wrap items-center gap-3">
        <AttendanceStatusBadge status={record.status} />
        {record.lateMinutes > 0 ? (
          <p className="font-ui text-xs text-taupe">
            You checked in {record.lateMinutes} minute{record.lateMinutes === 1 ? "" : "s"} late.
          </p>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Check in</dt>
          <dd className="mt-1 font-ui text-sm text-ink">{formatTime(record.checkIn)}</dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Check out</dt>
          <dd className="mt-1 font-ui text-sm text-ink">{formatTime(record.checkOut)}</dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Hours</dt>
          <dd className="mt-1 font-ui text-sm text-ink">
            {record.workMinutes ? formatMinutes(record.workMinutes) : checkedIn && !checkedOut ? "On the floor" : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 font-ui text-[11px] text-taupe">
        {location?.caption}. This is a browser demo — not payroll, GPS or biometric attendance.
      </p>

      {message ? (
        <p className="mt-3 font-ui text-xs text-cocoa" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      {onLeave ? (
        <p className="mt-4 font-ui text-sm text-taupe">You are on approved leave today.</p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {!checkedIn ? (
            <AtelierButton size="chip" onClick={() => run("in")} disabled={!canIn || busy}>
              {busy ? "Saving…" : "Check in"}
            </AtelierButton>
          ) : !checkedOut ? (
            <AtelierButton size="chip" onClick={() => run("out")} disabled={!canOut || busy}>
              {busy ? "Saving…" : "Check out"}
            </AtelierButton>
          ) : (
            <p className="font-ui text-sm text-ink">
              Today's attendance · in {formatTime(record.checkIn)} · out {formatTime(record.checkOut)} ·{" "}
              {formatMinutes(record.workMinutes)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
