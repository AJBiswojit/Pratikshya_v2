import StatusBadge from "../employee/StatusBadge";
import { getStatusMeta } from "../../services/offers/offerRepository";

export default function OfferStatusBadge({ status, className = "" }) {
  const meta = getStatusMeta(status);
  return <StatusBadge label={meta.label} tone={meta.tone} className={className} />;
}
