import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { AtelierButton } from "../../design-system";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import { ANALYTICS_PRESETS, ANALYTICS_PRESET_OPTIONS } from "../../services/analytics/dateRange";
import { ANALYTICS_STATUS_FILTERS } from "../../services/analytics/analyticsService";
import { ROLE_OPTIONS } from "../../config/employeeRoles";
import { DEPARTMENT_OPTIONS } from "../../config/employeeDepartments";
import taxonomyRepository from "../../services/taxonomyRepository";
import offerRepository from "../../services/offers/offerRepository";
import { cn } from "../../utils/cn";

const FILTERS_BY_VIEW = {
  overview: ["date"],
  sales: ["date", "status"],
  products: ["date", "category", "collection"],
  customers: ["date"],
  inventory: ["date", "location"],
  returns: ["date"],
  offers: ["date", "offer"],
  employees: ["date", "role", "department"],
};

export default function AnalyticsFilters({
  view = "overview",
  period,
  onPeriodChange,
  filters,
  onFiltersChange,
  locations = [],
}) {
  const [open, setOpen] = useState(false);
  const shown = FILTERS_BY_VIEW[view] || ["date"];
  const categories = taxonomyRepository.activeCategories();
  const collections = taxonomyRepository.activeCollections();
  const offers = offerRepository.all();

  const body = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {shown.includes("date") ? (
        <EmployeeField label="Period" id="analytics-period">
          <select
            id="analytics-period"
            value={period.preset}
            onChange={(event) => onPeriodChange({ preset: event.target.value })}
            className={employeeInputClass()}
          >
            {ANALYTICS_PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("date") && period.preset === ANALYTICS_PRESETS.CUSTOM ? (
        <>
          <EmployeeField label="From" id="analytics-from">
            <input
              id="analytics-from"
              type="date"
              value={period.start}
              onChange={(event) =>
                onPeriodChange({ preset: ANALYTICS_PRESETS.CUSTOM, start: event.target.value, end: period.end })
              }
              className={employeeInputClass()}
            />
          </EmployeeField>
          <EmployeeField label="To" id="analytics-to">
            <input
              id="analytics-to"
              type="date"
              value={period.end}
              onChange={(event) =>
                onPeriodChange({ preset: ANALYTICS_PRESETS.CUSTOM, start: period.start, end: event.target.value })
              }
              className={employeeInputClass()}
            />
          </EmployeeField>
        </>
      ) : null}

      {shown.includes("status") ? (
        <EmployeeField label="Order status" id="analytics-status">
          <select
            id="analytics-status"
            value={filters.status || "ALL"}
            onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}
            className={employeeInputClass()}
          >
            {ANALYTICS_STATUS_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("category") ? (
        <EmployeeField label="Category" id="analytics-category">
          <select
            id="analytics-category"
            value={filters.category || ""}
            onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("collection") ? (
        <EmployeeField label="Collection" id="analytics-collection">
          <select
            id="analytics-collection"
            value={filters.collection || ""}
            onChange={(event) => onFiltersChange({ ...filters, collection: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("offer") ? (
        <EmployeeField label="Offer" id="analytics-offer">
          <select
            id="analytics-offer"
            value={filters.offer || ""}
            onChange={(event) => onFiltersChange({ ...filters, offer: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All offers</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.code} · {offer.name}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("location") ? (
        <EmployeeField label="Location" id="analytics-location">
          <select
            id="analytics-location"
            value={filters.location || ""}
            onChange={(event) => onFiltersChange({ ...filters, location: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("role") ? (
        <EmployeeField label="Role" id="analytics-role">
          <select
            id="analytics-role"
            value={filters.role || ""}
            onChange={(event) => onFiltersChange({ ...filters, role: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}

      {shown.includes("department") ? (
        <EmployeeField label="Department" id="analytics-department">
          <select
            id="analytics-department"
            value={filters.department || ""}
            onChange={(event) => onFiltersChange({ ...filters, department: event.target.value })}
            className={employeeInputClass()}
          >
            <option value="">All departments</option>
            {DEPARTMENT_OPTIONS.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </EmployeeField>
      ) : null}
    </div>
  );

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-[11px] text-taupe">
          Showing <span className="text-ink">{period.label}</span>
          {period.comparison ? ` · ${period.comparison.label}` : ""}
        </p>
        <AtelierButton
          type="button"
          variant="outline"
          size="chip"
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={12} aria-hidden="true" /> Filters
        </AtelierButton>
      </div>

      <div className="hidden md:block">{body}</div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Analytics filters">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-mist bg-canvas p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">Filters</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-taupe" aria-label="Close filters">
                <X size={16} />
              </button>
            </div>
            {body}
            <div className="mt-5">
              <AtelierButton type="button" size="chip" onClick={() => setOpen(false)}>
                Apply period
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}

      <p className={cn("sr-only")} aria-live="polite">
        Analytics period {period.label}
      </p>
    </div>
  );
}
