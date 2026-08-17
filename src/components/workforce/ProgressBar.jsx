export default function ProgressBar({ value = 0, label, className = "" }) {
  const raw = Number(value) || 0;
  const width = Math.max(0, Math.min(100, raw));
  return (
    <div className={className}>
      <div className="h-1.5 w-full bg-mist/80" aria-hidden="true">
        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
      </div>
      <span className="sr-only">{label || `${Math.round(raw)} percent`}</span>
    </div>
  );
}
