import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingState, PageTransition } from "../design-system";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import PortalShell from "../components/navigation/PortalShell";
import usePortalDrawer from "../components/navigation/usePortalDrawer";
import usePortalSidebarCollapse from "../components/navigation/usePortalSidebarCollapse";

/**
 * The Admin shell.
 *
 * Desktop keeps a persistent sidebar that can collapse to an icon rail;
 * tablet and mobile use a drawer over a scrim. The header is the only
 * ink-dark band — content sits on the Atelier canvas so the portal still
 * reads as PRATIKSHYA FASHON rather than a generic dashboard chrome.
 */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const { navOpen, toggleNav, closeNav, triggerRef, drawerRef } = usePortalDrawer();
  const { collapsed, toggleCollapsed } = usePortalSidebarCollapse("admin");

  useEffect(() => {
    const previous = document.title;
    document.title = "Admin Portal — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas font-display text-ink selection:bg-accent selection:text-white">
      <AdminHeader navOpen={navOpen} onToggleNav={toggleNav} menuButtonRef={triggerRef} />

      <PortalShell
        collapsed={collapsed}
        navOpen={navOpen}
        onCloseNav={closeNav}
        drawerRef={drawerRef}
        expandedWidthClass="lg:w-[248px]"
        collapsedWidthClass="lg:w-[72px]"
        overlayClassName="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] lg:hidden"
        asideZClass="z-40"
        sidebar={
          <AdminSidebar
            onNavigate={closeNav}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={pathname} className="min-w-0 w-full max-w-full">
            <Suspense fallback={<LoadingState label="Opening this desk" />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </PortalShell>
    </div>
  );
}
