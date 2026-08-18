import { useRef, useState } from "react";
import { Film, Image as ImageIcon, UploadCloud } from "lucide-react";
import { AtelierButton } from "../../design-system";
import { MEDIA_TYPES, UPLOAD_ACCEPT, UPLOAD_RULES } from "../../config/mediaTypes";
import { cn } from "../../utils/cn";
import { extensionOf, typeOfFile, validateFile } from "../../services/media/uploadValidation";

export { extensionOf, typeOfFile, validateFile };

export const titleFromFileName = (name = "") => {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return stem ? stem.charAt(0).toUpperCase() + stem.slice(1) : "Untitled asset";
};

export default function MediaUploadDropzone({
  onFilesSelected,
  disabled = false,
  className = "",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (event.dataTransfer?.files?.length) {
      onFilesSelected(event.dataTransfer.files);
    }
  };

  const handleChange = (event) => {
    if (event.target?.files?.length) {
      onFilesSelected(event.target.files);
      event.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-all duration-200",
        isDragging
          ? "border-accent bg-accent/[0.08] shadow-inner"
          : "border-mist/90 bg-surface/40 hover:border-ink/40 hover:bg-surface/70",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas border border-mist shadow-sm">
        <UploadCloud size={26} strokeWidth={1.4} className="text-accent" aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-display text-base font-normal tracking-wide text-ink sm:text-lg">
        Drag & drop files here
      </h3>
      <p className="mt-1 font-ui text-xs text-taupe">
        or use the button below to browse from your device
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        id="media-file-input"
        aria-label="Browse and upload images and videos"
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <AtelierButton
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="border-ink/60 bg-canvas text-ink hover:bg-ink hover:text-ivory"
        >
          Browse Files
        </AtelierButton>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-mist/60 pt-4 font-ui text-[11px] text-taupe">
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon size={13} className="text-cocoa" aria-hidden="true" />
          <span>
            <strong>Images:</strong>{" "}
            {UPLOAD_RULES[MEDIA_TYPES.IMAGE].extensions
              .map((ext) => ext.replace(".", "").toUpperCase())
              .join(", ")}{" "}
            (up to {UPLOAD_RULES[MEDIA_TYPES.IMAGE].maxLabel})
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Film size={13} className="text-cocoa" aria-hidden="true" />
          <span>
            <strong>Videos:</strong> MP4, WEBM (up to 100 MB)
          </span>
        </span>
        <span className="rounded bg-canvas px-2 py-0.5 text-[10px] uppercase tracking-wider text-taupe border border-mist">
          Multiple files supported
        </span>
      </div>
    </div>
  );
}
