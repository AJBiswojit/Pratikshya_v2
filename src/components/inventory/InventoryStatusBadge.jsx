import { cn } from "../../utils/cn";

export const STOCK_STATUS_LABELS = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
  OVERSTOCKED: "Overstocked",
  UNAVAILABLE: "Unavailable",
};

export const TRANSFER_STATUS_LABELS = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const tones = {
  IN_STOCK: "border-cocoa/25 bg-cocoa/[0.06] text-cocoa",
  LOW_STOCK: "border-gold/50 bg-gold/10 text-cocoa",
  OUT_OF_STOCK: "border-accent/35 bg-accent/[0.07] text-accent",
  OVERSTOCKED: "border-brass/30 bg-brass/[0.07] text-brass",
  UNAVAILABLE: "border-mist bg-mist/25 text-taupe",
  DRAFT: "border-mist bg-mist/25 text-taupe",
  REQUESTED: "border-gold/50 bg-gold/10 text-cocoa",
  APPROVED: "border-brass/35 bg-brass/[0.08] text-brass",
  IN_TRANSIT: "border-ink/25 bg-ink/[0.05] text-ink",
  RECEIVED: "border-cocoa/25 bg-cocoa/[0.06] text-cocoa",
  CANCELLED: "border-accent/25 bg-accent/[0.05] text-accent",
};

export default function InventoryStatusBadge({ status, kind = "stock" }) {
  const labels = kind === "transfer" ? TRANSFER_STATUS_LABELS : STOCK_STATUS_LABELS;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap border px-2 py-1 font-ui text-[9px] font-medium uppercase tracking-[.14em]",
        tones[status] || tones.UNAVAILABLE
      )}
    >
      {labels[status] || String(status || "Unknown").replaceAll("_", " ")}
    </span>
  );
}
