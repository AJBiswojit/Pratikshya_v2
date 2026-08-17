import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Sliders,
  Camera,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { duration, transition } from "../../design-system";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

/**
 * Account Menu Dropdown for Global Site Header.
 *
 * Renders an Atelier-styled luxury dropdown when hovering or clicking the Account trigger.
 */
export default function AccountDropdown({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onClose,
  wishlistCount = 0,
}) {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSignOut = () => {
    signOut();
    onClose();
    navigate("/", { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: duration.page, ease: "easeOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute right-0 top-full mt-1.5 w-64 border border-mist/80 bg-canvas/95 backdrop-blur-md shadow-xl shadow-ink/10 py-3 z-50 text-left"
    >
      {isAuthenticated && user ? (
        <>
          {/* Customer Header */}
          <div className="px-5 py-2.5 border-b border-mist/60">
            <p className="font-ui text-[9px] uppercase tracking-[.25em] text-accent">
              Welcome
            </p>
            <p className="font-display text-base font-medium text-ink truncate mt-0.5">
              {user.firstName} {user.lastName || ""}
            </p>
            <p className="font-ui text-[11px] text-taupe truncate">
              {user.email}
            </p>
          </div>

          {/* Links */}
          <div className="py-2 space-y-0.5">
            <Link
              to="/account"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <User size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>My Account</span>
            </Link>

            <Link
              to="/account/ai-mirror"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <Camera size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>AI Mirror</span>
            </Link>

            <Link
              to="/account/orders"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <ShoppingBag size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Orders</span>
            </Link>

            <Link
              to="/account/wishlist"
              onClick={onClose}
              className={cn(
                "flex items-center justify-between px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <div className="flex items-center gap-3">
                <Heart size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Wishlist</span>
              </div>
              {wishlistCount > 0 && (
                <span className="font-ui text-[10px] text-accent font-medium">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/account/addresses"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Saved Addresses</span>
            </Link>

            <Link
              to="/account/settings"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <Sliders size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="pt-2 border-t border-mist/60 px-5">
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center gap-3 py-2 font-ui text-xs text-taupe hover:text-accent",
                transition.colors
              )}
            >
              <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="px-5 py-2 border-b border-mist/60">
            <p className="font-ui text-[9px] uppercase tracking-[.25em] text-accent">
              Your Atelier
            </p>
            <p className="font-display text-sm text-ink mt-0.5">
              Sign in for personal edits &amp; orders.
            </p>
          </div>

          <div className="py-2 space-y-0.5">
            <Link
              to="/signin"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 font-ui text-xs text-ink hover:text-accent hover:bg-surface/50 font-medium",
                transition.colors
              )}
            >
              <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Sign In</span>
            </Link>

            <Link
              to="/signup"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 font-ui text-xs text-graphite hover:text-accent hover:bg-surface/50",
                transition.colors
              )}
            >
              <UserPlus size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Create Account</span>
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
