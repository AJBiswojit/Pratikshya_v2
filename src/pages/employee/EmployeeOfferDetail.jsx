import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import OfferStatusBadge from "../../components/offers/OfferStatusBadge";
import { AtelierButton } from "../../design-system";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useOffer } from "../../hooks/useOffers";
import offerRepository, {
  OFFER_STATUS,
  describeCustomerEligibility,
  describeEligibility,
  formatOfferDiscount,
} from "../../services/offers/offerRepository";
import { formatINR } from "../../utils/shopping";

export default function EmployeeOfferDetail() {
  const { offerId } = useParams();
  const { employee, hasPermission } = useEmployeeAuth();
  const offer = useOffer(offerId);
  const [notice, setNotice] = useState("");

  const canEdit = hasPermission(PERMISSIONS.OFFERS_EDIT) || hasPermission(PERMISSIONS.OFFERS_MANAGE);
  const canActivate =
    hasPermission(PERMISSIONS.OFFERS_ACTIVATE) || hasPermission(PERMISSIONS.OFFERS_MANAGE);
  const canPause = hasPermission(PERMISSIONS.OFFERS_PAUSE) || hasPermission(PERMISSIONS.OFFERS_MANAGE);

  if (!offer) {
    return (
      <EmployeePage eyebrow="Offers" title="Offer not found">
        <Link to="/employee/offers" className="font-ui text-sm text-brass hover:text-accent">
          Back to offers
        </Link>
      </EmployeePage>
    );
  }

  const actor = employee
    ? {
        employeeId: employee.employeeId,
        label: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
      }
    : null;

  const act = (action) => {
    const result =
      action === "activate"
        ? offerRepository.activate(offer.id, actor)
        : offerRepository.pause(offer.id, actor);
    setNotice(result.ok ? `${offer.code} updated.` : result.error || "Could not update offer.");
  };

  return (
    <EmployeePage
      eyebrow={`Offers / ${offer.code}`}
      title={
        <>
          {offer.name} <span className="italic text-accent">{offer.code}</span>
        </>
      }
      description={offer.description || "House promotion."}
      actions={
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <AtelierButton as={Link} to={`/employee/offers/${offer.id}/edit`} size="chip">
              Edit
            </AtelierButton>
          ) : null}
          {canActivate && offer.displayStatus !== OFFER_STATUS.ACTIVE ? (
            <AtelierButton variant="outline" size="chip" onClick={() => act("activate")}>
              <Play size={12} /> Activate
            </AtelierButton>
          ) : null}
          {canPause && offer.displayStatus === OFFER_STATUS.ACTIVE ? (
            <AtelierButton variant="outline" size="chip" onClick={() => act("pause")}>
              <Pause size={12} /> Pause
            </AtelierButton>
          ) : null}
        </div>
      }
    >
      {notice ? (
        <p className="mb-5 border border-mist/80 bg-surface/30 px-4 py-3 font-ui text-sm">{notice}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-mist/80 bg-surface/30 p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Status</p>
          <div className="mt-2">
            <OfferStatusBadge status={offer.displayStatus} />
          </div>
        </div>
        <div className="border border-mist/80 bg-surface/30 p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Discount</p>
          <p className="mt-1 font-display text-2xl">{formatOfferDiscount(offer)}</p>
        </div>
        <div className="border border-mist/80 bg-surface/30 p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Minimum</p>
          <p className="mt-1 font-display text-2xl">
            {offer.minimumOrderValue ? formatINR(offer.minimumOrderValue) : "None"}
          </p>
        </div>
        <div className="border border-mist/80 bg-surface/30 p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Until</p>
          <p className="mt-1 font-display text-2xl">
            {offer.endDate
              ? new Date(`${offer.endDate}T00:00:00`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </p>
        </div>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 font-ui text-sm">
        <div className="border border-mist/70 p-4">
          <dt className="text-[10px] uppercase tracking-[.16em] text-taupe">Eligibility</dt>
          <dd className="mt-2">{describeEligibility(offer)}</dd>
        </div>
        <div className="border border-mist/70 p-4">
          <dt className="text-[10px] uppercase tracking-[.16em] text-taupe">Customers</dt>
          <dd className="mt-2">{describeCustomerEligibility(offer)}</dd>
        </div>
      </dl>
    </EmployeePage>
  );
}
