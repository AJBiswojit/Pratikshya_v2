import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import TargetCard from "../../components/workforce/TargetCard";
import ReviewForm, { EmployeeCommentForm, FeedbackReadout } from "../../components/workforce/ReviewPanel";
import AttendanceSummary from "../../components/workforce/AttendanceSummary";
import DataTable from "../../components/employee/DataTable";
import EmployeeField, { employeeInputClass } from "../../components/employee/EmployeeField";
import { PerformanceStatusBadge } from "../../components/workforce/WorkforceBadges";
import { formatPercent } from "../../components/workforce/format";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useWorkforce } from "../../context/WorkforceContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import {
  getEmployeePerformance,
  listVisiblePerformance,
  performanceHistory,
} from "../../services/workforce/performanceService";
import { monthOptions, periodFromDate } from "../../services/workforce/dateUtils";
import { canReviewPerformance, canViewPerformance } from "../../services/workforce/scope";
import { loadEmployees } from "../../services/employees/employeeService";

export default function EmployeePerformance() {
  const { employeeId: routeId } = useParams();
  const { employee, hasPermission } = useEmployeeAuth();
  const { revision } = useWorkforce();
  const [period, setPeriod] = useState(periodFromDate().key);
  void revision;

  const targetId = routeId || employee?.employeeId;
  const employees = loadEmployees();
  const allowed = employee && targetId ? canViewPerformance(employee, targetId, employees) : false;
  const record = allowed ? getEmployeePerformance(targetId, period, employee) : null;
  const history = allowed && targetId ? performanceHistory(targetId, employee) : [];
  const canReview = employee && record ? canReviewPerformance(employee) && employee.employeeId !== record.employeeId : false;
  const isSelf = employee?.employeeId === targetId;
  const team = useMemo(
    () => (hasPermission(PERMISSIONS.PERFORMANCE_REVIEW) ? listVisiblePerformance(employee, { period }) : []),
    [employee, period, revision, hasPermission]
  );

  if (!employee) return null;

  if (!allowed || !record) {
    return (
      <EmployeePage eyebrow="Performance" title="Not available">
        <p className="font-ui text-sm text-taupe">You do not have access to that performance record.</p>
      </EmployeePage>
    );
  }

  return (
    <EmployeePage
      eyebrow="My performance"
      title={
        <>
          How the month is <span className="italic text-accent">reading.</span>
        </>
      }
      description={`${record.name} · ${record.roleLabel} · ${record.periodLabel}. Targets are role-aware. Achievement comes from live house data.`}
    >
      <div className="mb-6 max-w-xs">
        <EmployeeField label="Period" id="emp-perf-period">
          <select id="emp-perf-period" value={period} onChange={(event) => setPeriod(event.target.value)} className={employeeInputClass()}>
            {monthOptions(8).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PerformanceStatusBadge status={record.status} />
        {record.displayScore != null ? (
          <p className="font-ui text-sm text-ink">Score {formatPercent(record.displayScore)}</p>
        ) : (
          <p className="font-ui text-sm text-taupe">Score appears once the review is written.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {record.metrics.map((metric) => (
          <TargetCard key={metric.metric} metric={metric} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AttendanceSummary employeeId={record.employeeId} month={record.period} compact />
        <section className="border border-mist/80 bg-surface/40 p-6">
          <h2 className="font-display text-2xl font-light text-ink">Review</h2>
          <div className="mt-4">
            {canReview ? (
              <ReviewForm record={record} actor={employee} canFinalize={hasPermission(PERMISSIONS.PERFORMANCE_MANAGE)} />
            ) : (
              <>
                <FeedbackReadout review={record.review} />
                {isSelf ? <EmployeeCommentForm record={record} actor={employee} /> : null}
              </>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-light text-ink">Previous periods</h2>
        <DataTable
          rows={history}
          rowKey="performanceId"
          empty="No earlier periods yet."
          columns={[
            { id: "periodLabel", label: "Period" },
            { id: "score", label: "Score", render: (row) => formatPercent(row.displayScore) },
            { id: "targetPercent", label: "Achievement", render: (row) => formatPercent(row.targetPercent) },
            { id: "status", label: "Status", render: (row) => <PerformanceStatusBadge status={row.status} /> },
            { id: "reviewer", label: "Reviewer", render: (row) => row.review?.reviewerName || "—" },
          ]}
        />
      </section>

      {team.length > 0 && hasPermission(PERMISSIONS.PERFORMANCE_REVIEW) ? (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-light text-ink">Team</h2>
          <DataTable
            rows={team.filter((row) => row.employeeId !== employee.employeeId)}
            rowKey="employeeId"
            empty="No team records."
            columns={[
              {
                id: "name",
                label: "Employee",
                render: (row) => (
                  <Link to={`/employee/performance/${row.employeeId}`} className="text-ink underline-offset-4 hover:text-accent hover:underline">
                    {row.name}
                  </Link>
                ),
              },
              { id: "roleLabel", label: "Role" },
              { id: "targetPercent", label: "Achievement", render: (row) => formatPercent(row.targetPercent) },
              { id: "attendance", label: "Attendance", render: (row) => formatPercent(row.attendance?.attendancePercent) },
              { id: "score", label: "Score", render: (row) => formatPercent(row.displayScore) },
              { id: "status", label: "Status", render: (row) => <PerformanceStatusBadge status={row.status} /> },
            ]}
          />
        </section>
      ) : null}
    </EmployeePage>
  );
}
