import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { usePageTransition } from "../motion";

/**
 * The fade a routed page plays as it enters and leaves.
 *
 * Wrap the content of a route, and render the route tree inside an
 * `AnimatePresence mode="wait"` keyed on the pathname — the outgoing page
 * finishes before the incoming one begins.
 *
 * Honours `prefers-reduced-motion`, in which case the page simply appears.
 */
export default function PageTransition({ as: Tag = "div", className = "", children, ...rest }) {
  const transitionProps = usePageTransition();
  const MotionTag = typeof Tag === "string" ? motion[Tag] ?? motion.div : Tag;

  return (
    <MotionTag {...transitionProps} className={cn(className)} {...rest}>
      {children}
    </MotionTag>
  );
}
