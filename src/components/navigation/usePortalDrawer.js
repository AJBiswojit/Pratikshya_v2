import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile/off-canvas drawer for the Admin and Employee shells.
 *
 * Desktop collapse is a separate preference (usePortalSidebarCollapse).
 * This hook only owns the small-screen drawer: open state, body scroll
 * lock, Escape to close, a simple focus trap, and returning focus to the
 * menu trigger when the drawer closes.
 */
export default function usePortalDrawer() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    if (typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => {
      const root = drawerRef.current;
      if (!root) return [];
      return [...root.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.getAttribute("aria-hidden") !== "true"
      );
    };

    const first = focusables()[0];
    first?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [navOpen]);

  const toggleNav = useCallback(() => setNavOpen((open) => !open), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return { navOpen, setNavOpen, toggleNav, closeNav, triggerRef, drawerRef };
}
