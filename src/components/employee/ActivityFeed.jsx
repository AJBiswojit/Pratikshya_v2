import { getActivityLabel } from "../../services/employees/activityService";
import { formatEmployeeDateTime } from "../../utils/employee";

export default function ActivityFeed({ entries = [], empty = "No activity recorded yet." }) {
  if (!entries.length) {
    return (
      <div className="border border-mist/80 bg-surface/30 px-5 py-8 text-center">
        <p className="font-ui text-sm text-taupe">{empty}</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-mist/70 border border-mist/80 bg-surface/30">
      {entries.map((entry) => (
        <li key={entry.id} className="px-4 py-4 sm:px-5">
          <p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">
            {getActivityLabel(entry.action)}
          </p>
          <p className="mt-1 font-ui text-sm text-ink">{entry.summary}</p>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            {entry.actorName} · {formatEmployeeDateTime(entry.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
