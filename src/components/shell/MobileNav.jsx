import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X, LogOut, User, ShoppingBag, MapPin, Sliders } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Brand,
  body,
  duration,
  eyebrow,
  nav as navType,
  pagePadding,
  transition,
} from "../../design-system";
import {
  brand,
  legalNavigation,
  primaryNavigation,
  utilityNavigation,
} from "../../config/navigationConfig";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import { utilityIcons } from "./utilityIcons";

/**
 * The mobile navigation drawer.
 *
 * Full-height, canvas, sliding in from the right. Each primary group is an
 * accordion: tapping the chevron opens its sub-links, tapping the label
 * itself goes to the group's landing page.
 *
 * Fully integrated with customer authentication state.
 */
export default function MobileNav({ onClose, counts = {} }) {
  const [expanded, setExpanded] = useState(null);
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  const toggle = (id) => setExpanded((current) => (current === id ? null : id));

  const handleSignOut = () => {
    signOut();
    onClose();
    navigate("/", { replace: true });
  };

  return (
    <motion.div className="lg:hidden fixed inset-0 z-50">
      {/* Scrim */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.page }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: duration.page, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 w-full max-w-sm bg-canvas flex flex-col overflow-y-auto"
      >
        {/* Drawer header */}
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-between gap-4 h-16 bg-canvas border-b border-mist/50",
            pagePadding
          )}
        >
          <Brand
            to={brand.home}
            onClick={onClose}
            size="default"
            variant="lockup"
            theme="light"
            wordmark={brand.name}
            className="text-ink hover:text-accent transition-colors"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={cn("-mr-2 p-2 text-brass hover:text-accent", transition.colors)}
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* Auth status banner on mobile */}
        <div className={cn("py-4 border-b border-mist/50 bg-surface/50", pagePadding)}>
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-[9px] uppercase tracking-[.25em] text-accent">
                    Welcome Back
                  </p>
                  <p className="font-display text-lg font-light text-ink">
                    {user.firstName} {user.lastName || ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="font-ui text-[11px] uppercase tracking-[.14em] text-taupe hover:text-accent inline-flex items-center gap-1"
                >
                  <LogOut size={12} aria-hidden="true" /> Sign Out
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-ui text-xs">
                <Link
                  to="/account"
                  onClick={onClose}
                  className="flex items-center gap-2 border border-pearl bg-canvas px-3 py-2 text-ink hover:text-accent"
                >
                  <User size={13} strokeWidth={1.5} />
                  <span>My Account</span>
                </Link>
                <Link
                  to="/account/orders"
                  onClick={onClose}
                  className="flex items-center gap-2 border border-pearl bg-canvas px-3 py-2 text-ink hover:text-accent"
                >
                  <ShoppingBag size={13} strokeWidth={1.5} />
                  <span>Orders</span>
                </Link>
                <Link
                  to="/account/addresses"
                  onClick={onClose}
                  className="flex items-center gap-2 border border-pearl bg-canvas px-3 py-2 text-ink hover:text-accent"
                >
                  <MapPin size={13} strokeWidth={1.5} />
                  <span>Addresses</span>
                </Link>
                <Link
                  to="/account/settings"
                  onClick={onClose}
                  className="flex items-center gap-2 border border-pearl bg-canvas px-3 py-2 text-ink hover:text-accent"
                >
                  <Sliders size={13} strokeWidth={1.5} />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/signin"
                onClick={onClose}
                className="flex-1 text-center py-2.5 px-4 bg-ink text-ivory font-ui text-xs uppercase tracking-[.14em] hover:bg-accent transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="flex-1 text-center py-2.5 px-4 border border-pearl bg-canvas text-ink font-ui text-xs uppercase tracking-[.14em] hover:border-ink transition-colors"
              >
                Join Atelier
              </Link>
            </div>
          )}
        </div>

        {/* Groups */}
        <nav aria-label="Mobile" className={cn("flex-1 py-6", pagePadding)}>
          <ul className="divide-y divide-mist/60">
            <li className="py-1">
              <Link
                to="/explore"
                onClick={onClose}
                className={cn(
                  "block py-3 text-2xl font-light tracking-tight text-ink hover:text-accent",
                  transition.colors
                )}
              >
                Explore
              </Link>
            </li>
            {primaryNavigation.map((group) => {
              const isOpen = expanded === group.id;

              return (
                <li key={group.id} className="py-1">
                  <div className="flex items-center justify-between">
                    <Link
                      to={group.to}
                      onClick={onClose}
                      className={cn(
                        "py-3 text-2xl font-light tracking-tight text-ink hover:text-accent",
                        transition.colors
                      )}
                    >
                      {group.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(group.id)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${group.label}`}
                      className={cn("p-2 -mr-2 text-brass hover:text-accent", transition.colors)}
                    >
                      <ChevronDown
                        size={16}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={cn("transition-transform duration-500", isOpen && "rotate-180")}
                      />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: duration.page, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5 space-y-5">
                          {group.columns.map((column) => (
                            <div key={column.title}>
                              <p className={cn(eyebrow.label, "text-taupe mb-3")}>{column.title}</p>
                              <ul className="space-y-2.5">
                                {column.links.map((link) => (
                                  <li key={link.to}>
                                    <Link
                                      to={link.to}
                                      onClick={onClose}
                                      className={cn(
                                        body.caption,
                                        "text-graphite hover:text-accent",
                                        transition.colors
                                      )}
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Utility */}
        <div className={cn("border-t border-mist/50 py-6", pagePadding)}>
          <ul className="grid grid-cols-2 gap-4">
            {utilityNavigation.map((item) => {
              const Icon = utilityIcons[item.icon];
              const count = counts[item.id];
              const target = item.id === "account" && !isAuthenticated ? "/signin" : item.to;

              return (
                <li key={item.id}>
                  <Link
                    to={target}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 text-brass hover:text-accent",
                      navType.link,
                      transition.colors
                    )}
                  >
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    {item.id === "account" && !isAuthenticated ? "Sign In" : item.label}
                    {count > 0 && <span className="text-accent">({count})</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className={cn("mt-6 flex flex-wrap gap-x-4 gap-y-2", body.micro, "text-taupe")}>
            {legalNavigation.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={cn("hover:text-accent", transition.colors)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}
