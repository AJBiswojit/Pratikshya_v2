import { getEmployeeStatus } from "../../config/employeeStatus";
import { cn } from "../../utils/cn";

const tones = {
  ink: "bg-ink text-ivory",
  accent: "bg-accent text-white",
  quiet: "bg-surface text-cocoa border border-mist",
  danger: "bg-accent/10 text-accent border border-accent/30",
  alert: "bg-amber-500/10 text-amber-800 border border-amber-500/30",
  brass: "bg-brass/15 text-brass-deep border border-brass/30",
  muted: "bg-canvas-deep text-taupe border border-mist",
};

export default function StatusBadge({ status, label, tone, className = "" }) {
  const definition = status ? getEmployeeStatus(status) : null;
  const resolvedTone = tone || definition?.tone || "quiet";
  const resolvedLabel = label || definition?.label || status || "—";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 font-ui text-[9px] uppercase tracking-widest",
        tones[resolvedTone] ?? tones.quiet,
        className
      )}
    >
      {resolvedLabel}
    </span>
  );
}
