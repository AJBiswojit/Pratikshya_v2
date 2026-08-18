import { Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AtelierButton } from "../../design-system";
import {
  MEDIA_TYPES,
  UPLOAD_ACCEPT,
  UPLOAD_NOTICE,
  UPLOAD_NOTICE_COPY,
  UPLOAD_RULES,
  formatFileSize,
  rolesForType,
} from "../../config/mediaTypes";
import { cn } from "../../utils/cn";
import { validateFile } from "../../services/media/uploadValidation";

/**
 * PRATIKSHYA FASHON — Demo media upload.
 *
 * Two honest ways to add media, side by side:
 *
 *   Files   chosen with the file input or dropped on the panel. They are
 *           previewed with a browser object URL, validated against the house
 *           limits, and queued so they can be removed before anything is
 *           saved. Nothing is uploaded anywhere — the object URL dies with
 *           the tab, so the saved record keeps its metadata and is marked as
 *           a demo placeholder rather than storing a dead address.
 *
 *   Address a real image or video URL, which is what a production record
 *           looks like once a media service exists.
 *
 * Object URLs are revoked when an item leaves the queue and when the panel
 * unmounts, so a long session does not leak them.
 */

/** The house rules, applied before a file is allowed into the queue. */
const validate = (file) => {
  const result = validateFile(file);
  if (!result.ok) return result;
  return { ok: true, type: result.type };
};

/** A title from a file name: "saree-pallu-01.jpg" → "Saree pallu 01". */
const titleFromFileName = (name = "") => {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return stem ? stem.charAt(0).toUpperCase() + stem.slice(1) : "Untitled media";
};

export default function MediaUploadPanel({
  onSubmit,
  showRole = false,
  disabled = false,
  busyLabel = "Add to library",
}) {
  const [queue, setQueue] = useState([]);
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [address, setAddress] = useState({ url: "", poster: "", title: "", alt: "", type: MEDIA_TYPES.IMAGE });
  const inputRef = useRef(null);
  const queueRef = useRef(queue);

  queueRef.current = queue;

  /* Revoke every preview URL still held when the panel goes away. */
  useEffect(
    () => () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    []
  );

  const accept = useCallback((fileList) => {
    const files = [...fileList];
    if (!files.length) return;

    const accepted = [];
    const rejected = [];

    files.forEach((file) => {
      const result = validate(file);
      if (!result.ok) {
        rejected.push(result.error);
        return;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        type: result.type,
        title: titleFromFileName(file.name),
        alt: "",
        role: rolesForType(result.type)[0]?.id ?? null,
        previewUrl: URL.createObjectURL(file),
      });
    });

    setQueue((current) => [...current, ...accepted]);
    setErrors(rejected);
  }, []);

  const discard = (key) => {
    setQueue((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.key !== key);
    });
  };

  const amend = (key, patch) =>
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const clearQueue = () => {
    queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setQueue([]);
    setErrors([]);
  };

  const saveQueue = () => {
    if (!queue.length) return;
    onSubmit(
      queue.map((item) => ({
        type: item.type,
        /* Deliberately no `url`: a browser preview address is not a
           production address, and the repository refuses it anyway. */
        title: item.title,
        alt: item.alt || item.title,
        role: showRole ? item.role : null,
        fileName: item.file.name,
        fileSize: item.file.size,
        mimeType: item.file.type || "",
        source: "Demo upload",
        demoPlaceholder: true,
      }))
    );
    clearQueue();
  };

  const saveAddress = (event) => {
    event.preventDefault();
    if (!address.url.trim()) return;
    onSubmit([
      {
        type: address.type,
        url: address.url.trim(),
        poster: address.poster.trim(),
        thumbnail: address.type === MEDIA_TYPES.IMAGE ? address.url.trim() : address.poster.trim(),
        title: address.title.trim() || "Untitled media",
        alt: address.alt.trim() || address.title.trim(),
        source: "Address",
      },
    ]);
    setAddress({ url: "", poster: "", title: "", alt: "", type: MEDIA_TYPES.IMAGE });
  };

  const field =
    "w-full border border-mist bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent";
  const label = "font-ui text-[10px] uppercase tracking-[.16em] text-taupe";

  return (
    <div className="space-y-6">
      <div className="border border-accent/30 bg-accent/[0.04] px-4 py-3">
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">{UPLOAD_NOTICE}</p>
        <p className="mt-1 font-ui text-[12px] leading-relaxed text-taupe">{UPLOAD_NOTICE_COPY}</p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Files                                                       */}
      {/* ---------------------------------------------------------- */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) accept(event.dataTransfer.files);
        }}
        className={cn(
          "border border-dashed px-5 py-8 text-center transition-colors",
          dragging ? "border-accent bg-accent/[0.06]" : "border-mist bg-surface/30",
          disabled && "opacity-50"
        )}
      >
        <UploadCloud size={22} strokeWidth={1.3} className="mx-auto text-taupe" aria-hidden="true" />
        <p className="mt-3 font-ui text-sm text-ink">Drop files here, or choose them.</p>
        <p className="mt-1 font-ui text-[11px] text-taupe">
          Images {UPLOAD_RULES[MEDIA_TYPES.IMAGE].extensions.join(" ")} up to{" "}
          {UPLOAD_RULES[MEDIA_TYPES.IMAGE].maxLabel} · Video{" "}
          {UPLOAD_RULES[MEDIA_TYPES.VIDEO].extensions.join(" ")} up to{" "}
          {UPLOAD_RULES[MEDIA_TYPES.VIDEO].maxLabel}
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
          className="sr-only"
          aria-label="Choose media files"
        />
        <AtelierButton
          size="chip"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-4"
        >
          Choose files
        </AtelierButton>
      </div>

      {errors.length ? (
        <ul
          role="alert"
          aria-live="assertive"
          className="space-y-1 border border-accent/40 bg-accent/[0.05] px-4 py-3"
        >
          {errors.map((error) => (
            <li key={error} className="font-ui text-[12px] text-accent">
              {error}
            </li>
          ))}
        </ul>
      ) : null}

      {queue.length ? (
        <div className="space-y-3">
          <p className={label}>Upload queue · {queue.length}</p>
          <ul className="space-y-3">
            {queue.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-3 border border-mist/80 bg-surface/30 p-3 sm:flex-row"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden bg-canvas-deep">
                  {item.type === MEDIA_TYPES.VIDEO ? (
                    <video
                      src={item.previewUrl}
                      preload="metadata"
                      muted
                      controls={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-ui text-[11px] text-taupe">
                      {item.file.name} · {formatFileSize(item.file.size)} ·{" "}
                      {item.type === MEDIA_TYPES.VIDEO ? "Video" : "Image"}
                    </p>
                    <button
                      type="button"
                      onClick={() => discard(item.key)}
                      aria-label={`Remove ${item.file.name} from the queue`}
                      className="text-taupe transition-colors hover:text-accent"
                    >
                      <Trash2 size={15} strokeWidth={1.4} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="sr-only">Title</span>
                      <input
                        value={item.title}
                        onChange={(event) => amend(item.key, { title: event.target.value })}
                        placeholder="Title"
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Alt text</span>
                      <input
                        value={item.alt}
                        onChange={(event) => amend(item.key, { alt: event.target.value })}
                        placeholder="Alt text"
                        className={field}
                      />
                    </label>
                    {showRole ? (
                      <label className="block sm:col-span-2">
                        <span className="sr-only">Role</span>
                        <select
                          value={item.role ?? ""}
                          onChange={(event) => amend(item.key, { role: event.target.value })}
                          className={field}
                        >
                          {rolesForType(item.type).map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <AtelierButton size="chip" onClick={saveQueue} disabled={disabled}>
              {busyLabel}
            </AtelierButton>
            <AtelierButton size="chip" variant="outline" onClick={clearQueue}>
              Clear queue
            </AtelierButton>
          </div>
          <p className="font-ui text-[11px] text-taupe">
            Saved queue items keep their title, alt text and role. Because there is no upload
            service in this phase, they are marked as demo placeholders and show house artwork
            until a real address is added.
          </p>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- */}
      {/* Address                                                     */}
      {/* ---------------------------------------------------------- */}
      <form onSubmit={saveAddress} className="space-y-3 border-t border-mist/70 pt-5">
        <p className={label}>Or add media by address</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={label}>Type</span>
            <select
              value={address.type}
              onChange={(event) => setAddress({ ...address, type: event.target.value })}
              className={field}
            >
              <option value={MEDIA_TYPES.IMAGE}>Image</option>
              <option value={MEDIA_TYPES.VIDEO}>Video</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={label}>Title</span>
            <input
              value={address.title}
              onChange={(event) => setAddress({ ...address, title: event.target.value })}
              placeholder="Bridal lehenga — pallu detail"
              className={field}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className={label}>Media URL</span>
            <input
              value={address.url}
              onChange={(event) => setAddress({ ...address, url: event.target.value })}
              placeholder="Paste a media URL"
              className={field}
            />
          </label>
          {address.type === MEDIA_TYPES.VIDEO ? (
            <label className="space-y-1 sm:col-span-2">
              <span className={label}>Poster URL</span>
              <input
                value={address.poster}
                onChange={(event) => setAddress({ ...address, poster: event.target.value })}
                placeholder="Poster URL"
                className={field}
              />
            </label>
          ) : null}
          <label className="space-y-1 sm:col-span-2">
            <span className={label}>Alt text</span>
            <input
              value={address.alt}
              onChange={(event) => setAddress({ ...address, alt: event.target.value })}
              placeholder="Described for a reader who cannot see the image"
              className={field}
            />
          </label>
        </div>
        <AtelierButton size="chip" type="submit" disabled={disabled || !address.url.trim()}>
          Add by address
        </AtelierButton>
      </form>
    </div>
  );
}
