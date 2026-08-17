import { CheckCircle2, Film, Image as ImageIcon, Trash2 } from "lucide-react";
import {
  MEDIA_TYPES,
  formatFileSize,
  rolesForType,
} from "../../config/mediaTypes";
import { cn } from "../../utils/cn";

const field =
  "w-full border border-mist bg-canvas px-2.5 py-1.5 font-ui text-xs text-ink outline-none transition-colors focus:border-accent";
const label = "font-ui text-[9px] uppercase tracking-[.16em] text-taupe";

export default function MediaUploadQueue({
  queue,
  onRemoveItem,
  onUpdateItem,
  onClearQueue,
  isProductMedia = true,
  disabled = false,
}) {
  if (!queue.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-mist/80 pb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-ui text-xs font-semibold uppercase tracking-[.16em] text-ink">
            Upload Queue
          </h4>
          <span className="rounded-full bg-ink px-2 py-0.5 font-ui text-[10px] font-medium text-ivory">
            {queue.length} {queue.length === 1 ? "file" : "files"}
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onClearQueue}
          className="font-ui text-[11px] uppercase tracking-wider text-taupe underline-offset-4 hover:text-accent hover:underline disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-3" aria-label="Selected upload files">
        {queue.map((item, index) => {
          const isVid = item.type === MEDIA_TYPES.VIDEO;
          const roles = rolesForType(item.type);

          return (
            <li
              key={item.key}
              className="border border-mist/90 bg-surface/40 p-3 transition-colors hover:bg-surface/70"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start">
                {/* Thumbnail & Badges */}
                <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-canvas-deep border border-mist">
                  {isVid ? (
                    <video
                      src={item.previewUrl}
                      preload="metadata"
                      muted
                      controls={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={item.alt || item.title || "Upload preview"}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span
                    className={cn(
                      "absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 font-ui text-[8px] font-medium uppercase tracking-wider",
                      isVid ? "bg-purple-950/80 text-purple-200" : "bg-ink/80 text-ivory"
                    )}
                  >
                    {isVid ? <Film size={9} /> : <ImageIcon size={9} />}
                    {item.type}
                  </span>
                </div>

                {/* Details & Metadata inputs */}
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-ink font-medium">
                        {item.file.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 font-ui text-[10px] text-taupe">
                        <span>{formatFileSize(item.file.size)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 size={11} aria-hidden="true" />
                          Ready
                        </span>
                        <span>•</span>
                        <span>Asset #{index + 1}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemoveItem(item.key)}
                      aria-label={`Remove ${item.file.name} from upload queue`}
                      className="p-1 text-taupe transition-colors hover:text-accent disabled:opacity-50"
                    >
                      <Trash2 size={16} strokeWidth={1.4} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Form inputs for metadata */}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor={`title-${item.key}`} className={label}>
                        Title <span className="text-accent">*</span>
                      </label>
                      <input
                        id={`title-${item.key}`}
                        type="text"
                        value={item.title}
                        disabled={disabled}
                        onChange={(e) => onUpdateItem(item.key, { title: e.target.value })}
                        placeholder="Asset title"
                        className={field}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`alt-${item.key}`} className={label}>
                        Alt text {isVid ? "(optional)" : <span className="text-accent">*</span>}
                      </label>
                      <input
                        id={`alt-${item.key}`}
                        type="text"
                        value={item.alt}
                        disabled={disabled}
                        onChange={(e) => onUpdateItem(item.key, { alt: e.target.value })}
                        placeholder="Descriptive alt text for accessibility"
                        className={field}
                      />
                    </div>

                    {isProductMedia ? (
                      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                        <label htmlFor={`role-${item.key}`} className={label}>
                          Media role <span className="text-accent">*</span>
                        </label>
                        <select
                          id={`role-${item.key}`}
                          value={item.role ?? ""}
                          disabled={disabled}
                          onChange={(e) => onUpdateItem(item.key, { role: e.target.value })}
                          className={field}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                      <label htmlFor={`caption-${item.key}`} className={label}>
                        Caption <span className="text-taupe lowercase font-normal">(optional)</span>
                      </label>
                      <input
                        id={`caption-${item.key}`}
                        type="text"
                        value={item.caption || ""}
                        disabled={disabled}
                        onChange={(e) => onUpdateItem(item.key, { caption: e.target.value })}
                        placeholder="Editorial caption or notes on craftsmanship..."
                        className={field}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
