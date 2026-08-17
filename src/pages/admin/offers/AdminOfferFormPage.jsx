import { Link, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import OfferForm from "../../../components/offers/OfferForm";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useOffer } from "../../../hooks/useOffers";

export default function AdminOfferFormPage() {
  const { offerId } = useParams();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const existing = useOffer(offerId);

  if (offerId && !existing) {
    return (
      <AdminPage eyebrow="Offers" title="Offer not found">
        <Link to="/admin/offers" className="font-ui text-sm text-brass hover:text-accent">
          Back to offers
        </Link>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow={existing ? `Business / Offers / ${existing.code}` : "Business / Offers"}
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
      description={
        existing
          ? "Historical usage and redeemed orders are never rewritten from this desk."
          : "Compose a coupon. Checkout will validate it through the existing pricing engine."
      }
    >
      <OfferForm offer={existing} actor={actor} basePath="/admin/offers" />
    </AdminPage>
  );
}
