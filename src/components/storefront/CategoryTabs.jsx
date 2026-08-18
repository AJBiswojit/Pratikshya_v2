/**
 * PRATIKSHYA FASHON — Category navigation chips.
 *
 * Renders subcategory/peer-category tabs directly from the canonical
 * taxonomy. The "All" chip always links back to the parent scope; sibling
 * tabs link to their canonical department/category paths.
 *
 * No product IDs, no hardcoded category lists — everything is derived from
 * the scope (department/category/subcategory filters) passed in and the
 * canonical `departments` tree.
 */

import { Link } from "react-router-dom";
import { departments } from "../../data/catalog/taxonomy";
import { cn } from "../../utils/cn";
import { eyebrow as eyebrowType } from "../../design-system/typography";
import { transition } from "../../design-system/motion";

/**
 * Given scope filters ({ department, category, subcategory }), derive the
 * set of tabs that should appear at the current level.
 *
 * - Department landing (e.g. /women)        → ALL + department's categories
 * - Category page   (e.g. /women/sarees)    → ALL + category's subcategories
 * - Subcategory page (e.g. /kids/boys/casual-sets) → ALL + sibling subcategories
 */
export function deriveTabs(scopeFilters = {}) {
  const { department, category } = scopeFilters;
  if (!department) return { parentPath: null, allLabel: "All", tabs: [] };

  const dept = departments.find((d) => d.id === department);
  if (!dept) return { parentPath: dept?.path ?? null, allLabel: "All", tabs: [] };

  // Department landing: show categories.
  if (!category) {
    return {
      parentPath: dept.path,
      allLabel: `All ${dept.name}`,
      tabs: dept.categories.map((cat) => ({
        label: cat.name,
        to: cat.path,
        id: cat.id,
      })),
    };
  }

  const cat = dept.categories.find((c) => c.id === category);
  if (!cat) return { parentPath: dept.path, allLabel: `All ${dept.name}`, tabs: [] };

  return {
    parentPath: cat.path,
    allLabel: `All ${cat.name}`,
    tabs: cat.subcategories.map((sub) => ({
      label: sub.name,
      to: sub.path,
      id: sub.id,
    })),
  };
}

/**
 * Returns true when the current pathname exactly matches the given tab
 * destination. Performs a trailing-slash-insensitive comparison.
 */
const isActive = (pathname, to) => {
  if (!to) return false;
  const normalize = (p) => String(p || "").replace(/\/+$/, "") || "/";
  return normalize(pathname) === normalize(to);
};

export default function CategoryTabs({
  scopeFilters = {},
  pathname,
  className = "",
}) {
  const { parentPath, allLabel, tabs } = deriveTabs(scopeFilters);

  // If there are no sibling tabs at this level, render nothing.
  if (!tabs || tabs.length === 0) return null;

  const allActive = parentPath ? isActive(pathname, parentPath) : false;

  return (
    <nav
      aria-label="Category navigation"
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-mist/70 pb-4",
        className
      )}
    >
      <TabChip to={parentPath} active={allActive}>
        {allLabel}
      </TabChip>

      {tabs.map((tab) => (
        <TabChip
          key={tab.id}
          to={tab.to}
          active={isActive(pathname, tab.to)}
        >
          {tab.label}
        </TabChip>
      ))}
    </nav>
  );
}

function TabChip({ to, active = false, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center border px-3.5 py-1.5 whitespace-nowrap",
        eyebrowType.label,
        transition.all,
        active
          ? "border-ink bg-ink text-ivory"
          : "border-mist text-taupe hover:border-ink hover:text-ink bg-transparent"
      )}
    >
      {children}
    </Link>
  );
}
