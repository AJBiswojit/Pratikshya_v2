import { Link } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { EMPLOYEE_BRAND } from "../../config/employeeNavigation";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import { getRole } from "../../config/employeeRoles";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import {
  employeeFullName,
  employeeInitials,
  formatTodayLong,
  greetingForNow,
} from "../../utils/employee";
import { cn } from "../../utils/cn";
import { Brand, transition } from "../../design-system";

export default function EmployeeHeader({ navOpen, onToggleNav }) {
  const { employee, signOut } = useEmployeeAuth();
  const role = getRole(employee?.role);
  const name = employeeFullName(employee);

  return (
    <header className="sticky top-0 z-30 border-b border-mist/80 bg-canvas/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            className="border border-pearl p-2 text-ink lg:hidden"
            onClick={onToggleNav}
            aria-expanded={navOpen}
            aria-controls="employee-navigation"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
          >
            {navOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <Brand
            to={EMPLOYEE_BRAND.home}
            size="default"
            variant="lockup"
            theme="light"
            wordmark={EMPLOYEE_BRAND.name}
            subtitle={`${EMPLOYEE_BRAND.portal} · ${EMPLOYEE_BRAND.subtitle}`}
            className="min-w-0"
          />
        </div>

        <div className="hidden min-w-0 flex-1 px-6 xl:block">
          <p className="truncate font-display text-xl font-light text-ink">
            {greetingForNow()}, <span className="italic text-accent">{employee?.firstName}</span>
          </p>
          <p className="mt-0.5 font-ui text-[11px] text-taupe">
            {role.label} · {getDepartmentLabel(employee?.department)} · {employee?.employeeId} ·{" "}
            {formatTodayLong()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/employee/profile"
            className="flex items-center gap-2"
            aria-label={`Open profile for ${name}`}
          >
            {employee?.avatar ? (
              <img src={employee.avatar} alt="" className="h-9 w-9 object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center bg-ink font-display text-sm font-light text-ivory">
                {employeeInitials(employee)}
              </span>
            )}
            <span className="hidden text-left sm:block">
              <span className="block font-ui text-xs text-ink">{name}</span>
              <span className="block font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                {employee?.employeeId}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className={cn(
              "inline-flex items-center gap-2 border border-pearl bg-canvas px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:border-accent hover:text-accent",
              transition.colors
            )}
          >
            <LogOut size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
