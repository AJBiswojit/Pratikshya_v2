import { cn } from "../../utils/cn";

/**
 * Shared Admin / Employee chrome below the portal header.
 *
 * Desktop: a persistent sidebar whose width follows the collapse preference.
 * The main column is flex-1 + min-w-0 so it consumes remaining width and
 * never keeps the expanded-sidebar measure after collapse.
 *
 * Mobile / tablet below `lg`: the sidebar is an off-canvas drawer. Collapse
 * is not applied — the drawer always shows full labels.
 */
export default function PortalShell({
  collapsed = false,
  navOpen = false,
  onCloseNav,
  drawerRef,
  sidebar,
  children,
  expandedWidthClass = "lg:w-[248px]",
  collapsedWidthClass = "lg:w-[72px]",
  overlayClassName = "fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] lg:hidden",
  asideZClass = "z-40",
  beforeMain = null,
  mainClassName = "",
}) {
  return (
    <div className="lg:flex lg:min-w-0">
      {navOpen ? (
        <button
          type="button"
          className={overlayClassName}
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={onCloseNav}
        />
      ) : null}

      <aside
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 w-72 overflow-hidden border-r border-mist/80 bg-canvas pt-[65px]",
          "transition-[width,transform] duration-200 ease-out motion-reduce:transition-none",
          "lg:static lg:z-0 lg:translate-x-0 lg:overflow-visible lg:pt-0 lg:shrink-0",
          asideZClass,
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? collapsedWidthClass : expandedWidthClass
        )}
      >
        <div className="h-full lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)]">
          {sidebar}
        </div>
      </aside>

      <main
        className={cn(
          "relative min-h-[calc(100vh-65px)] min-w-0 w-full max-w-full flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8",
          mainClassName
        )}
      >
        {beforeMain}
        {children}
      </main>
    </div>
  );
}
