import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Returns the viewport to the top on navigation.
 *
 * A hash is left alone so in-page anchors on the landing page keep working,
 * and the jump is instant rather than smooth — a route change is a new
 * page, not a scroll.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
