import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingState, PageTransition } from "../design-system";
import EmployeeHeader from "../components/employee/EmployeeHeader";
import EmployeeSidebar from "../components/employee/EmployeeSidebar";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";
import { requiredPermissionForPath } from "../config/employeeNavigation";

export default function EmployeeLayout() {
  const { pathname } = useLocation();
  const { employee, hasPermission } = useEmployeeAuth();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previous = document.title;
    document.title = "Employee Portal — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  /* Escape closes the mobile navigation drawer. */
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const required = requiredPermissionForPath(pathname);
  if (required && employee && !hasPermission(required) && pathname !== "/employee/access-denied") {
    return <Navigate to="/employee/access-denied" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-display selection:bg-accent selection:text-white">
      <EmployeeHeader navOpen={navOpen} onToggleNav={() => setNavOpen((open) => !open)} />

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
            aria-label="Close navigation overlay"
            tabIndex={-1}
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 overflow-hidden border-r border-mist/80 bg-canvas pt-[65px] transition-transform lg:static lg:z-0 lg:w-auto lg:translate-x-0 lg:overflow-visible lg:pt-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)]">
            <EmployeeSidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </aside>

        <main className="relative min-h-[calc(100vh-65px)] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <p className="mb-6 font-ui text-[11px] text-taupe xl:hidden">
            {employee?.employeeId} · {employee?.shift}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={pathname}>
              <Suspense fallback={<LoadingState label="Preparing this desk" />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
