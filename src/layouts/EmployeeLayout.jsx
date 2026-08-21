import { Suspense, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingState, PageTransition } from "../design-system";
import EmployeeHeader from "../components/employee/EmployeeHeader";
import EmployeeSidebar from "../components/employee/EmployeeSidebar";
import PortalShell from "../components/navigation/PortalShell";
import usePortalDrawer from "../components/navigation/usePortalDrawer";
import usePortalSidebarCollapse from "../components/navigation/usePortalSidebarCollapse";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import { requiredPermissionForPath } from "../config/employeeNavigation";

export default function EmployeeLayout() {
  const { pathname } = useLocation();
  const { employee, hasPermission } = useEmployeeAuth();
  const { navOpen, toggleNav, closeNav, triggerRef, drawerRef } = usePortalDrawer();
  const { collapsed, toggleCollapsed } = usePortalSidebarCollapse("employee");

  useEffect(() => {
    const previous = document.title;
    document.title = "Employee Portal — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  const required = requiredPermissionForPath(pathname);
  if (required && employee && !hasPermission(required) && pathname !== "/employee/access-denied") {
    return <Navigate to="/employee/access-denied" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-display selection:bg-accent selection:text-white">
      <EmployeeHeader navOpen={navOpen} onToggleNav={toggleNav} menuButtonRef={triggerRef} />

      <PortalShell
        collapsed={collapsed}
        navOpen={navOpen}
        onCloseNav={closeNav}
        drawerRef={drawerRef}
        expandedWidthClass="lg:w-[240px]"
        collapsedWidthClass="lg:w-[72px]"
        overlayClassName="fixed inset-0 z-20 bg-ink/30 lg:hidden"
        asideZClass="z-30"
        sidebar={
          <EmployeeSidebar
            onNavigate={closeNav}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        }
        beforeMain={
          <p className="mb-6 font-ui text-[11px] text-taupe xl:hidden">
            {employee?.employeeId} · {employee?.shift}
          </p>
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={pathname} className="min-w-0 w-full max-w-full">
            <Suspense fallback={<LoadingState label="Preparing this desk" />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </PortalShell>
    </div>
  );
}
