import { Link, Navigate, useParams } from "react-router-dom";
import EmployeePage from "../../components/employee/EmployeePage";
import OfferForm from "../../components/offers/OfferForm";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useOffer } from "../../hooks/useOffers";

export default function EmployeeOfferForm() {
  const { offerId } = useParams();
  const { employee, hasPermission } = useEmployeeAuth();
  const existing = useOffer(offerId);

  const canCreate = hasPermission(PERMISSIONS.OFFERS_CREATE) || hasPermission(PERMISSIONS.OFFERS_MANAGE);
  const canEdit = hasPermission(PERMISSIONS.OFFERS_EDIT) || hasPermission(PERMISSIONS.OFFERS_MANAGE);

  if (offerId && !canEdit) return <Navigate to="/employee/access-denied" replace />;
  if (!offerId && !canCreate) return <Navigate to="/employee/access-denied" replace />;

  if (offerId && !existing) {
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

  return (
    <EmployeePage
      eyebrow={existing ? `Offers / ${existing.code}` : "Offers"}
      title={
        existing ? (
          <>
            Edit <span className="italic text-accent">{existing.code}</span>
          </>
        ) : (
          <>
            New <span className="italic text-accent">offer.</span>
          </>
        )
      }
      description="The same form the Admin Portal uses. Checkout still prices the bag."
    >
      <OfferForm offer={existing} actor={actor} basePath="/employee/offers" />
    </EmployeePage>
  );
}
