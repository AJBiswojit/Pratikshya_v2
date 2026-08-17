import { Link } from "react-router-dom";
import { AtelierButton } from "../../design-system";
import EmployeePage from "../../components/employee/EmployeePage";
import LeavePanel, { LeaveRequestForm } from "../../components/workforce/LeavePanel";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";

export default function EmployeeLeave() {
  const { employee, hasPermission } = useEmployeeAuth();
  if (!employee) return null;
  const canCreate = hasPermission(PERMISSIONS.LEAVE_CREATE);
  const canReview = hasPermission(PERMISSIONS.LEAVE_APPROVE) || hasPermission(PERMISSIONS.LEAVE_MANAGE);

  return (
    <EmployeePage
      eyebrow="Leave"
      title={
        <>
          Time away from the <span className="italic text-accent">floor.</span>
        </>
      }
      description="Request leave against the house calendar. Approved days appear as leave on the attendance register — they are not stored twice."
      actions={
        <AtelierButton as={Link} to="/employee/attendance" variant="outline" size="chip">
          Attendance
        </AtelierButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {canCreate ? <LeaveRequestForm actor={employee} /> : <div />}
        <LeavePanel employeeId={employee.employeeId} actor={employee} team={canReview} />
      </div>
    </EmployeePage>
  );
}
