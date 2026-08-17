import { employeeAttendanceSummary } from "../../services/workforce/attendanceService";
import { formatMonthLabel, formatMinutes } from "../../services/workforce/dateUtils";
import { formatPercent } from "./format";

export default function AttendanceSummary({ employeeId, month, compact = false }) {
  const summary = employeeAttendanceSummary(employeeId, month);
  const tiles = [
    ["Present", summary.present],
    ["Late", summary.late],
    ["Absent", summary.absent],
    ["Leave", summary.leave],
    ["Half day", summary.halfDay],
    ["Working days", summary.workingDays],
    ["Attendance", formatPercent(summary.attendancePercent)],
    ["Hours", formatMinutes(summary.workMinutes)],
  ];

  return (
    <section className="border border-mist/80 bg-surface/40 p-6">
      <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Summary</p>
      <h2 className="mt-2 font-display text-2xl font-light text-ink">{formatMonthLabel(month)}</h2>
      <dl className={`mt-5 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {tiles.map(([label, value]) => (
          <div key={label} className="border border-mist/70 bg-canvas/70 p-3">
            <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
            <dd className="mt-1 font-display text-xl font-light text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-ui text-[11px] text-taupe">
        Attendance % is present-equivalent days against eligible working days. Leave, holidays and week-offs are excluded.
      </p>
    </section>
  );
}
