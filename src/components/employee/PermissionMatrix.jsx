import { PERMISSION_CATALOGUE } from "../../config/employeePermissions";
import { cn } from "../../utils/cn";

export default function PermissionMatrix({
  permissions = [],
  editable = false,
  onToggle,
  className = "",
}) {
  const allowed = new Set(permissions);

  return (
    <div className={cn("space-y-6", className)}>
      {PERMISSION_CATALOGUE.map((group) => (
        <section key={group.group} aria-labelledby={`perm-${group.group}`}>
          <h3
            id={`perm-${group.group}`}
            className="mb-3 font-ui text-[10px] uppercase tracking-[.2em] text-brass"
          >
            {group.group}
          </h3>
          <ul className="divide-y divide-mist/70 border border-mist/80 bg-canvas/60">
            {group.items.map((item) => {
              const isOn = allowed.has(item.key);
              return (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="font-ui text-sm text-ink">{item.label}</span>
                  {editable ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={`${item.label}: ${isOn ? "allowed" : "not allowed"}`}
                      onClick={() => onToggle?.(item.key, !isOn)}
                      className={cn(
                        "min-w-[4.5rem] border px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.16em] transition-colors",
                        isOn
                          ? "border-ink bg-ink text-ivory"
                          : "border-pearl bg-canvas text-taupe hover:border-ink hover:text-ink"
                      )}
                    >
                      {isOn ? "Allowed" : "No"}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "font-ui text-[10px] uppercase tracking-[.16em]",
                        isOn ? "text-cocoa" : "text-taupe"
                      )}
                    >
                      {isOn ? "Allowed" : "No"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
