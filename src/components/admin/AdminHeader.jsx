import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Store, User, X } from "lucide-react";
import { ADMIN_BRAND } from "../../config/adminNavigation";
import { getAdminRoleLabel } from "../../config/adminAccess";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminInitials } from "../../utils/admin";
import { cn } from "../../utils/cn";
import { Brand, transition } from "../../design-system";

/**
 * The Admin Portal header.
 *
 * Brand, the working identity, and a profile menu that closes on Escape,
 * on outside click and on navigation. Notifications are a deliberate
 * placeholder in this phase — the control is labelled as such rather than
 * pretending to carry unread business events.
 */
export default function AdminHeader({ navOpen, onToggleNav, menuButtonRef }) {
  const { admin, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink text-ivory">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            className="border border-ivory/25 p-2 text-ivory transition-colors hover:border-gold hover:text-gold lg:hidden"
            onClick={onToggleNav}
            aria-expanded={navOpen}
            aria-controls="admin-navigation"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
          >
            {navOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <Brand
            to={ADMIN_BRAND.home}
            size="default"
            variant="lockup"
            theme="dark"
            wordmark={ADMIN_BRAND.name}
            subtitle={`${ADMIN_BRAND.portal} · ${ADMIN_BRAND.subtitle}`}
            className="min-w-0"
          />
        </div>

        <div className="hidden min-w-0 flex-1 px-6 xl:block">
          <p className="truncate font-ui text-[11px] uppercase tracking-[.2em] text-ash">
            {ADMIN_BRAND.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={cn(
              "hidden items-center gap-2 border border-ivory/20 px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ash hover:border-gold hover:text-gold sm:inline-flex",
              transition.colors
            )}
          >
            <Store size={13} aria-hidden="true" />
            Store
          </Link>

          <span
            className="hidden items-center border border-ivory/20 p-2 text-ash sm:inline-flex"
            title="Notifications arrive with the operations modules"
            aria-label="Notifications — not available in this phase"
          >
            <Bell size={14} aria-hidden="true" />
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 border border-transparent p-1 pr-2 transition-colors hover:border-ivory/25"
            >
              {admin?.avatar ? (
                <img src={admin.avatar} alt="" className="h-9 w-9 object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center bg-gold font-display text-sm font-light text-ink">
                  {adminInitials(admin)}
                </span>
              )}
              <span className="hidden text-left sm:block">
                <span className="block font-ui text-xs text-ivory">{admin?.name}</span>
                <span className="block font-ui text-[10px] uppercase tracking-[.14em] text-ash">
                  {getAdminRoleLabel(admin?.role)}
                </span>
              </span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Admin profile"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 border border-mist bg-canvas p-1 text-ink shadow-xl"
              >
                <div className="border-b border-mist/70 px-4 py-3">
                  <p className="font-display text-lg font-light">{admin?.name}</p>
                  <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
                    {admin?.adminId}
                  </p>
                </div>
                <Link
                  to="/admin/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 font-ui text-[11px] uppercase tracking-[.14em] text-ink hover:bg-surface"
                >
                  <User size={13} aria-hidden="true" /> Admin profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left font-ui text-[11px] uppercase tracking-[.14em] text-accent hover:bg-accent/5"
                >
                  <LogOut size={13} aria-hidden="true" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
