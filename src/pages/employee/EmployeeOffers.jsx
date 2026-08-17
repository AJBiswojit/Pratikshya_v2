/**
 * PRATIKSHYA FASHON — Employee offers (Phase 17)
 *
 * Floor visibility of the same offer register the Admin Portal authors.
 * Create / edit only appear when the signed-in role has permission.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import DataTable from "../../components/employee/DataTable";
import OfferStatusBadge from "../../components/offers/OfferStatusBadge";
import { AtelierButton } from "../../design-system";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useOffers } from "../../hooks/useOffers";
import {
  OFFER_STATUS,
  describeEligibility,
  formatOfferDiscount,
} from "../../services/offers/offerRepository";
import { employeeInputClass } from "../../components/employee/EmployeeField";

export default function EmployeeOffers() {
  const { hasPermission } = useEmployeeAuth();
  const canCreate = hasPermission(PERMISSIONS.OFFERS_CREATE) || hasPermission(PERMISSIONS.OFFERS_MANAGE);
  const canEdit = hasPermission(PERMISSIONS.OFFERS_EDIT) || hasPermission(PERMISSIONS.OFFERS_MANAGE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(canCreate ? "ALL" : OFFER_STATUS.ACTIVE);

  const offers = useOffers({ query, status });
  const rows = useMemo(
    () =>
      offers.map((offer) => ({
        ...offer,
        applies: describeEligibility(offer),
        value: formatOfferDiscount(offer),
        until: offer.endDate
          ? new Date(`${offer.endDate}T00:00:00`).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
      })),
    [offers]
  );

  return (
    <EmployeePage
      eyebrow="Offers"
      title={
        <>
          House <span className="italic text-accent">offers.</span>
        </>
      }
      description={
        canCreate
          ? "The same promotion register the atelier authors. Create and activate only what the floor is allowed to change."
          : "Live and scheduled house offers the floor may apply. Administration belongs to the offer desk."
      }
      actions={
        canCreate ? (
          <AtelierButton as={Link} to="/employee/offers/new" size="chip">
            <Plus size={13} aria-hidden="true" /> New offer
          </AtelierButton>
        ) : null
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search offers</span>
          <Search className="absolute left-3 top-3 text-taupe" size={15} aria-hidden="true" />
          <input
            className={`${employeeInputClass()} pl-9`}
            placeholder="Search code or name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter by status"
          className={employeeInputClass()}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value={OFFER_STATUS.ACTIVE}>Active</option>
          <option value={OFFER_STATUS.SCHEDULED}>Scheduled</option>
          <option value={OFFER_STATUS.PAUSED}>Paused</option>
          <option value={OFFER_STATUS.DRAFT}>Draft</option>
          <option value={OFFER_STATUS.EXPIRED}>Expired</option>
        </select>
      </div>

      <DataTable
        rows={rows}
        empty="No offers match those filters."
        columns={[
          {
            id: "code",
            label: "Code",
            render: (row) => (
              <Link
                to={`/employee/offers/${row.id}`}
                className="font-ui text-sm font-medium underline-offset-4 hover:text-accent hover:underline"
              >
                {row.code}
              </Link>
            ),
          },
          { id: "name", label: "Offer" },
          { id: "value", label: "Discount" },
          { id: "applies", label: "Eligibility" },
          {
            id: "status",
            label: "Status",
            render: (row) => <OfferStatusBadge status={row.displayStatus} />,
          },
          { id: "until", label: "Until" },
          {
            id: "actions",
            label: " ",
            render: (row) =>
              canEdit ? (
                <Link
                  to={`/employee/offers/${row.id}/edit`}
                  className="font-ui text-[11px] uppercase tracking-widest text-brass hover:text-accent"
                >
                  Edit
                </Link>
              ) : (
                <Link
                  to={`/employee/offers/${row.id}`}
                  className="font-ui text-[11px] uppercase tracking-widest text-brass hover:text-accent"
                >
                  View
                </Link>
              ),
          },
        ]}
      />
    </EmployeePage>
  );
}
