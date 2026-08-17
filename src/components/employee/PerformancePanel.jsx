import { Link } from "react-router-dom";
import { Rule } from "../../design-system";
import { useWorkforce } from "../../context/WorkforceContext";
import { getEmployeePerformance } from "../../services/workforce/performanceService";
import { periodFromDate } from "../../services/workforce/dateUtils";
import ProgressBar from "../workforce/ProgressBar";
import TargetCard from "../workforce/TargetCard";
import { formatPercent } from "../workforce/format";
import { PerformanceStatusBadge } from "../workforce/WorkforceBadges";

export default function PerformancePanel({ employeeId, compact = false }) {
  const { revision } = useWorkforce();
  void revision;
  const period = periodFromDate();
  const record = employeeId ? getEmployeePerformance(employeeId, period.key) : null;

  if (!record) {
    return (
      <section className="border border-mist/80 bg-surface/40 p-6">
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Performance</p>
        <h2 className="mt-2 font-display text-2xl font-light text-ink">This month</h2>
        <p className="mt-3 font-ui text-sm text-taupe">No performance record is available.</p>
      </section>
    );
  }

  const headline = record.metrics[0];

  return (
    <section className="border border-mist/80 bg-surface/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Performance</p>
          <h2 className="mt-2 font-display text-2xl font-light text-ink">{record.periodLabel}</h2>
        </div>
        <PerformanceStatusBadge status={record.status} />
      </div>
      <Rule width="w-8" tone="accent" className="my-3" />

      {headline ? (
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-ui text-xs text-taupe">{headline.label}</p>
            <p className="font-ui text-xs text-ink">{formatPercent(headline.percent)}</p>
          </div>
          <ProgressBar value={headline.percent || 0} label={`${headline.label} ${formatPercent(headline.percent)}`} />
        </div>
      ) : null}

      {compact ? (
        <p className="font-ui text-sm text-taupe">
          Target achievement {formatPercent(record.targetPercent)}
          {record.displayScore != null ? ` · score ${formatPercent(record.displayScore)}` : ""}
          {record.attendance?.attendancePercent != null
            ? ` · attendance ${formatPercent(record.attendance.attendancePercent)}`
            : ""}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {record.metrics.map((metric) => (
            <TargetCard key={metric.metric} metric={metric} />
          ))}
        </div>
      )}

      <p className="mt-5 font-ui text-[11px] text-taupe">
        Achievement reads from live house data — orders, stock, fulfillment and the care desk.
        {" "}
        <Link to="/employee/performance" className="text-ink underline-offset-4 hover:text-accent hover:underline">
          Open performance
        </Link>
      </p>
    </section>
  );
}
