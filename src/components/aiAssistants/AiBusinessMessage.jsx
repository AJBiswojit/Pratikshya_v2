import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import AdminMetricCard from "../admin/AdminMetricCard";
import { AtelierButton } from "../../design-system";
import { AiAssistantMark } from "./AiConversationLog";

const timeOf = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const TYPE_LABELS = {
  GREETING: "Welcome",
  BUSINESS_SUMMARY: "Business summary",
  SALES_INSIGHT: "Sales insight",
  PRODUCT_INSIGHT: "Product insight",
  CATEGORY_INSIGHT: "Category insight",
  CUSTOMER_INSIGHT: "Customer insight",
  INVENTORY_INSIGHT: "Inventory insight",
  RETURN_INSIGHT: "Returns insight",
  OFFER_INSIGHT: "Offer insight",
  FULFILLMENT_INSIGHT: "Fulfillment insight",
  WORKFORCE_INSIGHT: "Workforce insight",
  RECOMMENDATION: "Recommendation",
  ALERT: "Attention needed",
  TREND: "Trend",
  NO_DATA: "Notice",
};

/**
 * Renders one business assistant envelope: narrative, metric tiles,
 * supporting rows, operational actions and quiet follow-ups. All figures
 * arrive inside the envelope from the analytics read-model.
 */
export default function AiBusinessMessage({ message, onSuggestion, onActionOpened }) {
  const at = timeOf(message.createdAt);
  const paragraphs = String(message.text || "").split("\n").filter((line) => line.trim());

  return (
    <div className="flex flex-col gap-3">
      <AiAssistantMark at={at} name="PRATIKSHYA AI · BUSINESS" />

      <article className="border border-mist/80 bg-surface/40 px-4 py-4 sm:px-5" aria-label={message.headline || TYPE_LABELS[message.type] || "Insight"}>
        <p className="font-ui text-[9px] uppercase tracking-[.2em] text-accent">
          {TYPE_LABELS[message.type] ?? "Insight"}
          {message.periodLabel ? <span className="ml-2 text-taupe">· {message.periodLabel}</span> : null}
        </p>
        {message.headline ? (
          <h3 className="mt-1.5 font-display text-2xl font-light tracking-tight text-ink">{message.headline}</h3>
        ) : null}

        <div className="mt-3 space-y-2.5">
          {paragraphs.map((line, index) => (
            <p key={index} className="whitespace-pre-line font-ui text-sm leading-relaxed text-graphite">
              {line}
            </p>
          ))}
        </div>

        {message.metrics?.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {message.metrics.map((metric, index) => (
              <AdminMetricCard
                key={`${metric.label}-${index}`}
                label={metric.label}
                value={metric.value}
                hint={metric.hint}
                tone={metric.tone}
              />
            ))}
          </div>
        ) : null}

        {message.rows?.length ? (
          <ul className="mt-4 divide-y divide-mist/70 border border-mist/70" aria-label="Supporting detail">
            {message.rows.map((row, index) => (
              <li key={`${row.label}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="min-w-0 flex-1 font-ui text-sm text-ink">{row.label}</span>
                <span className="font-ui text-sm font-medium text-ink">{row.value}</span>
                {row.detail ? (
                  <span className="w-full font-ui text-[11px] text-taupe sm:w-auto">{row.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {message.actions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Recommended actions">
            {message.actions.map((action) => (
              <AtelierButton
                key={action.to}
                as={Link}
                to={action.to}
                variant="outline"
                size="chip"
                onClick={() => onActionOpened?.(action)}
              >
                {action.label} <ArrowUpRight size={11} aria-hidden="true" />
              </AtelierButton>
            ))}
          </div>
        ) : null}

        {message.suggestions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Follow-up questions">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion?.(suggestion)}
                className="border border-pearl px-3 py-1 font-ui text-[11px] text-graphite transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-3 font-ui text-[9px] uppercase tracking-[.16em] text-taupe/90">{message.source}</p>
      </article>
    </div>
  );
}
