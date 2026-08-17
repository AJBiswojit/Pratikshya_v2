import { Link } from "react-router-dom";
import { AtelierButton, EmptyState } from "../../design-system";

export default function AnalyticsEmpty({
  title = "No data for this period.",
  description,
  actionTo,
  actionLabel,
}) {
  return (
    <EmptyState
      eyebrow="Analytics"
      title={title}
      description={description}
      className="py-16 md:py-20"
      actions={
        actionTo ? (
          <AtelierButton as={Link} to={actionTo} size="chip">
            {actionLabel}
          </AtelierButton>
        ) : null
      }
    />
  );
}
