import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";

/**
 * PRATIKSHYA FASHON — Shared Portal sidebar rendering.
 *
 * Used by BOTH the Admin and Employee portals. It renders:
 *   - an identity header (real authenticated identity)
 *   - collapsible, role/scope-aware navigation groups
 *   - a utility footer (Profile + Sign out)
 *
 * All authorization filtering happens upstream (navigationForRole /
 * the admin config). This component is purely presentational, so it never
 * invents visibility or weakens a route guard.
 *
 * Icon resolution, active-route resolution, badge source and persistence
 * key are injected so each portal keeps its own identity.
 */
export default function PortalSidebar({
  navId,
  ariaLabel,
  groups,
  resolveActiveId,
  badges = {},
  identity = {},
  footerLinks = [],
  signOut,
  onNavigate,
  storageKey,
  iconResolver,
}) {
  const location = useLocation();
  const pathname = location?.pathname ?? "";

  /* The navigation data contract: an array of groups, each with an items
     array. Both portals satisfy it, but a portal may hand over an empty or
     still-loading configuration, so it is normalised once, here. */
  const navGroups = useMemo(() => normalizeGroups(groups), [groups]);

  const resolveIcon = useMemo(() => makeIconResolver(iconResolver), [iconResolver]);

  const activeId = useMemo(() => {
    if (typeof resolveActiveId !== "function") return null;
    try {
      return resolveActiveId(pathname, navGroups) ?? null;
    } catch {
      /* An unmatched or unexpected pathname must never break the portal. */
      return null;
    }
  }, [pathname, navGroups, resolveActiveId]);

  const activeGroupId = useMemo(() => {
    for (const group of navGroups) {
      const hasActive = group.items.some(
        (item) =>
          item.id === activeId ||
          (Array.isArray(item.children) &&
            item.children.some((child) => child.id === activeId))
      );
      if (hasActive) return group.id;
    }
    return null;
  }, [navGroups, activeId]);

  const [expanded, setExpanded] = useState(() => {
    const persisted = readPersistedGroups(storageKey);
    /* Fresh visitors (no stored preference) see the Overview group open;
       everything else stays compact so the sidebar does not create
       excessive height. */
    const seed = persisted ?? new Set(defaultOpenGroupIds(normalizeGroups(groups)));
    if (activeGroupId) seed.add(activeGroupId);
    return seed;
  });

  useEffect(() => {
    writePersistedGroups(storageKey, expanded);
  }, [storageKey, expanded]);

  /* Auto-expand the group of the current route and keep it open while
     navigating inside it. */
  useEffect(() => {
    if (!activeGroupId) return;
    setExpanded((current) => {
      if (current.has(activeGroupId)) return current;
      const next = new Set(current);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId, pathname]);

  const toggleGroup = (groupId) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const isOpen = (groupId) => expanded.has(groupId);
  const LogoutIcon = resolveIcon("logout");

  const footerItems = Array.isArray(footerLinks)
    ? footerLinks.filter((link) => link && link.id && link.to)
    : [];

  /* Sign out stays a handler, never a route. */
  const handleSignOut = typeof signOut === "function" ? signOut : undefined;

  /* Identity may still be hydrating on the first paint, so every field has a
     rendering-only fallback. No real person is ever hardcoded. */
  const displayName = identity?.name || "Team member";
  const displayRole = identity?.roleLabel || "Team member";
  const displayInitials = identity?.initials || "PF";

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* ------------------------------------------------ identity */}
      <div className="border-b border-mist/70 px-4 py-4">
        <div className="flex items-center gap-3">
          {identity?.avatar ? (
            <img
              src={identity.avatar}
              alt=""
              className="h-10 w-10 shrink-0 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-ink font-display text-sm font-light text-ivory"
            >
              {displayInitials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-medium leading-tight text-ink">
              {displayName}
            </p>
            <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
              {displayRole}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ navigation */}
      <nav
        id={navId}
        aria-label={ariaLabel}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
      >
        {navGroups.map((group) => {
          const GroupIcon = resolveIcon(group.icon);
          const open = isOpen(group.id);
          return (
            <section key={group.id} className="mb-3 last:mb-0">
              <h2 className="px-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  aria-controls={`navgroup-${group.id}`}
                  className="group/heading flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <GroupIcon
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0 text-brass"
                    />
                    <span className="truncate font-ui text-[10px] font-medium uppercase tracking-[.18em] text-taupe group-hover/heading:text-ink">
                      {group.label}
                    </span>
                  </span>
                  <Chevron iconResolver={resolveIcon} open={open} />
                </button>
              </h2>

              {open ? (
                <ul id={`navgroup-${group.id}`} className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <GroupItems
                      key={item.id}
                      item={item}
                      activeId={activeId}
                      badge={badges?.[item.id]}
                      onNavigate={onNavigate}
                      iconResolver={resolveIcon}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </nav>

      {/* ------------------------------------------------ footer */}
      <div className="border-t border-mist/70 px-3 py-3">
        <ul className="space-y-0.5">
          {footerItems.map((link) => {
            const Icon = resolveIcon(link.icon);
            /* Footer destinations are NOT part of the navigation groups, so
               their active state is resolved from the pathname directly. */
            const linkActive = isPathActive(pathname, link.to);
            return (
              <li key={link.id}>
                <Link
                  to={link.to}
                  onClick={onNavigate}
                  aria-current={linkActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-none px-3 py-2 font-ui text-[11px] uppercase tracking-[.14em]",
                    linkActive
                      ? "bg-ink text-ivory"
                      : "text-taupe hover:bg-surface hover:text-ink"
                  )}
                >
                  <Icon aria-hidden="true" size={14} strokeWidth={1.5} />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-3 py-2 text-left font-ui text-[11px] uppercase tracking-[.14em] text-taupe hover:bg-surface hover:text-ink"
            >
              <LogoutIcon aria-hidden="true" size={14} strokeWidth={1.5} />
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Chevron({ open, iconResolver }) {
  const ChevronDown = iconResolver("chevronDown");
  return (
    <ChevronDown
      aria-hidden="true"
      size={14}
      strokeWidth={1.5}
      className={cn(
        "shrink-0 text-taupe transition-transform duration-200",
        open ? "rotate-180" : "rotate-0"
      )}
    />
  );
}

function GroupItems({ item, activeId, badge, onNavigate, iconResolver }) {
  const Icon = iconResolver(item.icon);
  const isActive = item.id === activeId;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  return (
    <li>
      <Link
        to={item.to}
        onClick={onNavigate}
        title={item.label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex min-w-0 items-center gap-2.5 rounded-none border-l-2 py-2 pl-3 pr-2 font-ui text-[11px] uppercase tracking-[.12em] transition-colors",
          isActive
            ? "border-accent bg-ink font-medium text-ivory"
            : "border-transparent text-taupe hover:bg-surface hover:text-ink"
        )}
      >
        <Icon
          size={14}
          strokeWidth={isActive ? 2 : 1.5}
          aria-hidden="true"
          className={cn("shrink-0", isActive ? "text-accent" : "text-brass")}
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge > 0 ? (
          <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 font-ui text-[9px] font-medium leading-none text-white">
            {badge}
          </span>
        ) : null}
      </Link>

      {hasChildren ? (
        <ul className="mt-0.5 space-y-0.5 border-l-2 border-mist/50 pl-4">
          {item.children.map((child) => (
            <li key={child.id}>
              <ChildLink
                child={child}
                activeId={activeId}
                onNavigate={onNavigate}
                iconResolver={iconResolver}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ChildLink({ child, activeId, onNavigate, iconResolver }) {
  const Icon = iconResolver(child.icon);
  const isActive = child.id === activeId;
  return (
    <Link
      to={child.to}
      onClick={onNavigate}
      title={child.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-2 rounded-none border-l-2 py-1.5 pl-3 pr-2 font-ui text-[10px] uppercase tracking-[.12em] transition-colors",
        isActive
          ? "border-accent bg-ink font-medium text-ivory"
          : "border-transparent text-taupe hover:bg-surface hover:text-ink"
      )}
    >
      <Icon
        size={12}
        strokeWidth={isActive ? 2 : 1.5}
        aria-hidden="true"
        className={cn("shrink-0", isActive ? "text-accent" : "text-brass")}
      />
      <span className="min-w-0 flex-1 truncate">{child.label}</span>
    </Link>
  );
}

/**
 * THE NAVIGATION DATA CONTRACT.
 *
 * PortalSidebar renders `groups`: an array of
 *   { id, label, icon, items: [{ id, label, to, icon, children? }] }
 *
 * Admin passes ADMIN_NAV_GROUPS and Employee passes the permission-filtered
 * result of navigationForRole — both already satisfy this shape. Normalising
 * once here means the render tree below can iterate without null checks, and
 * a portal whose configuration is momentarily empty renders an empty nav
 * instead of crashing the whole layout.
 */
function normalizeGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((group) => group && group.id)
    .map((group) => ({
      ...group,
      items: Array.isArray(group.items)
        ? group.items
            .filter((item) => item && item.id && item.to)
            .map((item) => ({
              ...item,
              children: Array.isArray(item.children)
                ? item.children.filter((child) => child && child.id && child.to)
                : undefined,
            }))
        : [],
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Every icon is resolved through the portal's own lucide-react map. A missing
 * or unknown key must never render `undefined` as a component — that alone
 * would crash the sidebar — so an inert placeholder is the last resort.
 */
function makeIconResolver(iconResolver) {
  return (name) => {
    if (typeof iconResolver !== "function") return FallbackIcon;
    try {
      return iconResolver(name) || FallbackIcon;
    } catch {
      return FallbackIcon;
    }
  };
}

function FallbackIcon(props) {
  return <span aria-hidden="true" {...props} />;
}

/** Fresh visitors open Overview only; fall back to the first group. */
function defaultOpenGroupIds(groups) {
  if (!groups.length) return [];
  const overview = groups.find((group) => group.id === "overview");
  return [overview ? overview.id : groups[0].id];
}

/** Exact match, or a nested path under it. Safe for undefined pathnames. */
function isPathActive(pathname, to) {
  if (!pathname || !to) return false;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Returns the stored preference, or null when there is nothing usable stored
 * (first visit, corrupted value, or storage unavailable) so the caller can
 * apply its own default.
 */
function readPersistedGroups(key) {
  if (!key || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((id) => typeof id === "string" && id));
  } catch {
    return null;
  }
}

function writePersistedGroups(key, groups) {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...groups]));
  } catch {
    /* storage unavailable — preference simply is not remembered */
  }
}
