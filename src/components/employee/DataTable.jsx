import { cn } from "../../utils/cn";

/**
 * Operational table that becomes a stacked card list on small screens.
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  empty = "Nothing to show just now.",
  className = "",
}) {
  if (!rows.length) {
    return (
      <div className="border border-mist/80 bg-surface/30 px-5 py-10 text-center">
        <p className="font-ui text-sm text-taupe">{empty}</p>
      </div>
    );
  }

  return (
    <div className={cn("border border-mist/80 bg-surface/30", className)}>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left">
          <thead className="border-b border-mist/80 bg-canvas/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="px-4 py-3 font-ui text-[10px] uppercase tracking-[.16em] text-taupe"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row[rowKey] ?? index} className="border-b border-mist/50 last:border-0">
                {columns.map((column) => (
                  <td key={column.id} className="px-4 py-3.5 align-top font-ui text-sm text-ink">
                    {column.render ? column.render(row) : row[column.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-mist/70 md:hidden">
        {rows.map((row, index) => (
          <li key={row[rowKey] ?? index} className="space-y-2 px-4 py-4">
            {columns.map((column) => (
              <div key={column.id} className="flex items-start justify-between gap-4">
                <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
                  {column.label}
                </span>
                <div className="min-w-0 text-right font-ui text-sm text-ink">
                  {column.render ? column.render(row) : row[column.id]}
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
