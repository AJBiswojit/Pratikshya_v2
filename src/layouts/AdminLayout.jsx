import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingState, PageTransition } from "../design-system";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";

/**
 * The Admin shell.
 *
 * Desktop keeps a persistent sidebar; tablet and mobile collapse it into a
 * drawer over a scrim. The header is the only ink-dark band — content sits
 * on the Atelier canvas so the portal still reads as PRATIKSHYA FASHON
 * rather than a generic dashboard chrome.
 */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previous = document.title;
    document.title = "Admin Portal — PRATIKSHYA FASHON";
    return () => {
      document.title = previous;
    };
  }, []);

  /* The drawer holds the page still while it is open on small screens. */
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    if (navOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  /* Escape closes the mobile navigation drawer. */
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  return (
    <div className="min-h-screen bg-canvas font-display text-ink selection:bg-accent selection:text-white">
      <AdminHeader navOpen={navOpen} onToggleNav={() => setNavOpen((open) => !open)} />

      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] lg:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-mist/80 bg-canvas pt-[65px] transition-transform duration-300 lg:static lg:z-0 lg:w-auto lg:translate-x-0 lg:overflow-visible lg:pt-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)]">
            <AdminSidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </aside>

        <main className="relative min-h-[calc(100vh-65px)] min-w-0 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={pathname}>
              <Suspense fallback={<LoadingState label="Opening this desk" />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
