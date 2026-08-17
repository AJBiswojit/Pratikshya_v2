import { Link } from "react-router-dom";
import { getDepartmentLabel } from "../../../config/employeeDepartments";
import { getRole } from "../../../config/employeeRoles";
import { useEmployeeAuth } from "../../../context/EmployeeAuthContext";
import {
  employeeFullName,
  formatTodayLong,
  greetingForNow,
} from "../../../utils/employee";
import { defaultDashboardMetrics } from "../../../services/employees/operationsService";
import MetricCard from "../MetricCard";
import AttendancePanel from "../AttendancePanel";
import PerformancePanel from "../PerformancePanel";

export default function DashboardFrame({
  eyebrow,
  title,
  description,
  extras = null,
  metrics: metricsOverride = null,
  children,
}) {
  const { employee } = useEmployeeAuth();
  const role = getRole(employee?.role);
  const metrics = metricsOverride || defaultDashboardMetrics(employee?.role);

  return (
    <div className="pb-16">
      <header className="mb-8 border border-mist/80 bg-surface/40 p-6 sm:p-8">
        <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
          {eyebrow || role.portal}
        </p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
          {title || (
            <>
              {greetingForNow()}, <span className="italic text-accent">{employee?.firstName}</span>
            </>
          )}
        </h1>
        <p className="mt-3 max-w-2xl font-ui text-sm leading-relaxed text-taupe">
          {description ||
            `${employeeFullName(employee)} · ${role.label} · ${getDepartmentLabel(employee?.department)} · ${employee?.employeeId}`}
        </p>
        <p className="mt-2 font-ui text-[11px] uppercase tracking-[.14em] text-brass">
          {formatTodayLong()}
          {employee?.shift ? ` · ${employee.shift}` : ""}
        </p>
      </header>

      {metrics.primary?.length ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.primary.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      ) : null}

      {children}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AttendancePanel />
        <PerformancePanel employeeId={employee?.employeeId} compact />
      </div>

      {extras}

      <p className="mt-8 font-ui text-[11px] text-taupe">
        Need the storefront?{" "}
        <Link to="/" className="text-ink underline-offset-4 hover:text-accent hover:underline">
          Open PRATIKSHYA FASHON
        </Link>
      </p>
    </div>
  );
}
