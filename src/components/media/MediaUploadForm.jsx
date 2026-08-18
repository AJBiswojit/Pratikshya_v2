import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Film, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { AtelierButton } from "../../design-system";
import MediaUploadDropzone, { titleFromFileName, validateFile } from "./MediaUploadDropzone";
import MediaUploadQueue from "./MediaUploadQueue";
import MediaProductSelector from "./MediaProductSelector";
import MediaPlacementSelector from "./MediaPlacementSelector";
import {
  MARKETING_PLACEMENTS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  UPLOAD_NOTICE,
  UPLOAD_NOTICE_COPY,
  rolesForType,
} from "../../config/mediaTypes";
import { PERMISSIONS } from "../../config/employeePermissions";
import useMediaActions from "../../hooks/useMediaActions";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import catalogRepository from "../../services/catalogRepository";
import { getImage } from "../../data/mediaPlaceholder";
import { cn } from "../../utils/cn";

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

/** Maps a product or manifest keyword to a fallback image plate so demo uploads render cleanly. */
const getDemoPlate = (productId, type, index = 0) => {
  if (type === MEDIA_TYPES.VIDEO) {
    return {
      url: SAMPLE_VIDEO,
      poster: getImage("saree-silk")?.src || "",
    };
  }
  const product = productId ? catalogRepository.find(productId) : null;
  if (product?.image) {
    const src = typeof product.image === "object" ? product.image.src : getImage(product.image)?.src;
    if (src) return { url: src, poster: "" };
  }
  const pool = ["saree-silk", "saree-traditional", "saree-banarasi", "fabric-silk", "lehenga-bridal", "women-bridal-wear"];
  const pick = pool[index % pool.length];
  return {
    url: getImage(pick)?.src || "",
    poster: "",
  };
};

export default function MediaUploadForm({
  initialScope = MEDIA_SCOPES.PRODUCT,
  initialProductId = null,
  initialPlacement = null,
  allowScopeChange = true,
  portalType = "auto", // "admin" | "employee" | "auto"
  onSuccessRedirect = null,
}) {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { employee, hasPermission } = useEmployeeAuth();
  const actions = useMediaActions();

  const isEmployeeSession = portalType === "employee" || (portalType === "auto" && !admin && Boolean(employee));
  const canManageMarketing = admin ? true : Boolean(hasPermission?.(PERMISSIONS.MEDIA_MANAGE) || hasPermission?.("media.manage"));
  const isAuthorizedToUpload = isEmployeeSession
    ? Boolean(hasPermission?.(PERMISSIONS.MEDIA_UPLOAD) || hasPermission?.("media.upload"))
    : actions.access?.canUpload ?? true;

  const [scope, setScope] = useState(() =>
    !canManageMarketing ? MEDIA_SCOPES.PRODUCT : initialScope
  );
  const [productId, setProductId] = useState(initialProductId);
  const [placement, setPlacement] = useState(initialPlacement || MARKETING_PLACEMENTS.HOME_HERO);

  // Marketing metadata fields
  const [campaign, setCampaign] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");

  // Upload queue & state
  const [queue, setQueue] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [formError, setFormError] = useState(null);

  // Upload progress simulation: "idle" | "preparing" | "uploading" | "completed" | "failed"
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResults, setUploadedResults] = useState([]);

  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const handleFilesSelected = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      if (!files.length) return;

      const accepted = [];
      const rejected = [];

      files.forEach((file, idx) => {
        const val = validateFile(file);
        if (!val.ok) {
          rejected.push(val.error);
          return;
        }

        const role = rolesForType(val.type)[0]?.id ?? (val.type === MEDIA_TYPES.VIDEO ? PRODUCT_MEDIA_ROLES.PRODUCT_VIDEO : PRODUCT_MEDIA_ROLES.GALLERY);
        const previewUrl = URL.createObjectURL(file);

        accepted.push({
          key: `${file.name}-${file.size}-${Date.now()}-${idx}`,
          file,
          type: val.type,
          title: titleFromFileName(file.name),
          alt: val.type === MEDIA_TYPES.IMAGE ? titleFromFileName(file.name) : "",
          caption: "",
          role,
          previewUrl,
        });
      });

      setQueue((prev) => [...prev, ...accepted]);
      setFileErrors(rejected);
      setFormError(null);
    },
    []
  );

  const handleRemoveItem = useCallback((key) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  const handleUpdateItem = useCallback((key, patch) => {
    setQueue((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }, []);

  const handleClearQueue = useCallback(() => {
    queue.forEach((item) => {
      if (item.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueue([]);
    setFileErrors([]);
  }, [queue]);

  const validateForm = () => {
    if (!queue.length) {
      setFormError("Please select at least one image or video to upload.");
      return false;
    }

    if (scope === MEDIA_SCOPES.PRODUCT && !productId) {
      setFormError("Please select a target product for this product media upload.");
      return false;
    }

    if (scope === MEDIA_SCOPES.MARKETING) {
      if (!canManageMarketing) {
        setFormError("You do not have permission to manage marketing media.");
        return false;
      }
      if (!placement) {
        setFormError("Please select a marketing placement for this upload.");
        return false;
      }
    }

    // Check that all queue items have non-empty titles
    for (const item of queue) {
      if (!item.title?.trim()) {
        setFormError(`"${item.file.name}" is missing a title.`);
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    // Simulation of demo upload phases
    setUploadState("preparing");
    setUploadProgress(15);

    await new Promise((r) => setTimeout(r, 450));
    setUploadState("uploading");
    setUploadProgress(50);

    await new Promise((r) => setTimeout(r, 600));
    setUploadProgress(90);

    try {
      const isProduct = scope === MEDIA_SCOPES.PRODUCT;

      const drafts = queue.map((item, index) => {
        const demoPlate = getDemoPlate(productId, item.type, index);

        return {
          type: item.type,
          title: item.title.trim(),
          alt: item.alt?.trim() || item.title.trim(),
          caption: item.caption?.trim() || "",
          role: isProduct ? item.role : null,
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type || "",
          demoPlaceholder: true,
          // Assign demo URL so when approved it resolves into a valid storefront plate
          url: demoPlate.url,
          poster: demoPlate.poster || "",
          thumbnail: demoPlate.poster || demoPlate.url,
          sampleUrl: demoPlate.url,
          samplePoster: demoPlate.poster,
          sampleThumbnail: demoPlate.poster || demoPlate.url,
          tags: isProduct ? ["product", "upload"] : ["marketing", "campaign"],
          placement: isProduct ? null : placement,
          campaign: isProduct ? null : campaign.trim() || null,
          campaignStart: isProduct ? null : campaignStart || null,
          campaignEnd: isProduct ? null : campaignEnd || null,
        };
      });

      const context = isProduct
        ? {
            productId,
            scope: MEDIA_SCOPES.PRODUCT,
            status: isEmployeeSession ? MEDIA_STATUS.PENDING_REVIEW : MEDIA_STATUS.ACTIVE,
          }
        : {
            placement,
            scope: MEDIA_SCOPES.MARKETING,
            campaign: campaign.trim() || null,
            status: isEmployeeSession ? MEDIA_STATUS.PENDING_REVIEW : MEDIA_STATUS.ACTIVE,
          };

      const created = actions.upload(drafts, context);

      setUploadedResults(created);
      setUploadProgress(100);
      setUploadState("completed");
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState("failed");
      setFormError("An error occurred during demo upload. Please try again.");
    }
  };

  const handleResetForNext = () => {
    handleClearQueue();
    setUploadState("idle");
    setUploadProgress(0);
    setUploadedResults([]);
    setFormError(null);
  };

  const selectedProduct = useMemo(
    () => (productId ? catalogRepository.find(productId) : null),
    [productId]
  );

  // Success view
  if (uploadState === "completed") {
    const isEmployee = isEmployeeSession;
    const count = uploadedResults.length;
    const imgCount = uploadedResults.filter((r) => r.type === MEDIA_TYPES.IMAGE).length;
    const vidCount = uploadedResults.filter((r) => r.type === MEDIA_TYPES.VIDEO).length;

    const returnUrl = onSuccessRedirect || (isEmployee ? "/employee/media" : "/admin/media");

    return (
      <div className="border border-mist bg-canvas p-6 sm:p-10 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={36} className="text-emerald-700" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="font-ui text-[10px] uppercase tracking-[.24em] text-emerald-800 font-semibold">
            {isEmployee ? "Submitted for Review" : "Upload Complete"}
          </span>
          <h2 className="font-display text-2xl font-normal text-ink">
            Media uploaded successfully.
          </h2>
          <p className="font-ui text-sm text-taupe max-w-md mx-auto">
            <strong className="text-ink font-semibold">{count} media {count === 1 ? "asset" : "assets"}</strong> ({imgCount} {imgCount === 1 ? "image" : "images"}
            {vidCount > 0 ? `, ${vidCount} ${vidCount === 1 ? "video" : "videos"}` : ""}) {isEmployee ? "submitted to the review queue" : "added to the media register"}
            {selectedProduct ? ` for "${selectedProduct.name}"` : ""}.
          </p>
        </div>

        <div className="rounded border border-mist/80 bg-surface/50 p-4 text-left font-ui text-xs space-y-2">
          <div className="flex items-center justify-between text-taupe border-b border-mist/60 pb-2">
            <span>Workflow Status</span>
            <span className="font-medium text-ink">
              {isEmployee ? "Pending Review" : "Active"}
            </span>
          </div>
          <p className="text-taupe text-[11px] leading-relaxed">
            {isEmployee
              ? "Your upload is now in the management review queue. Once approved by a manager or administrator, the assets will become visible on customer-facing product pages."
              : "Media assets are now active in the central repository and attached to the selected product / placement."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <AtelierButton
            type="button"
            size="sm"
            onClick={() => navigate(returnUrl)}
            className="bg-ink text-ivory hover:bg-cocoa"
          >
            View Media
          </AtelierButton>
          <AtelierButton
            type="button"
            size="sm"
            variant="outline"
            onClick={handleResetForNext}
          >
            Continue Uploading
          </AtelierButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Notice Banner */}
      <div className="border border-amber-300/60 bg-amber-50/50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] font-semibold text-amber-900">
              {UPLOAD_NOTICE}
            </p>
            <p className="font-ui text-xs leading-relaxed text-amber-900/80">
              {UPLOAD_NOTICE_COPY} Assets are processed locally in demo mode and logged in the house activity journal.
            </p>
          </div>
        </div>
      </div>

      {/* Scope Selector: Product vs Marketing */}
      {allowScopeChange && canManageMarketing ? (
        <div className="space-y-2">
          <label className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe">
            Media Workflow Destination
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              disabled={uploadState !== "idle"}
              onClick={() => {
                setScope(MEDIA_SCOPES.PRODUCT);
                setFormError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 p-3 font-ui text-xs uppercase tracking-wider border transition-all",
                scope === MEDIA_SCOPES.PRODUCT
                  ? "border-ink bg-ink text-ivory font-medium"
                  : "border-mist bg-canvas text-cocoa hover:border-ink/60"
              )}
            >
              <ImageIcon size={14} />
              Product Media
            </button>
            <button
              type="button"
              disabled={uploadState !== "idle"}
              onClick={() => {
                setScope(MEDIA_SCOPES.MARKETING);
                setFormError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 p-3 font-ui text-xs uppercase tracking-wider border transition-all",
                scope === MEDIA_SCOPES.MARKETING
                  ? "border-ink bg-ink text-ivory font-medium"
                  : "border-mist bg-canvas text-cocoa hover:border-ink/60"
              )}
            >
              <Film size={14} />
              Marketing Media
            </button>
          </div>
        </div>
      ) : null}

      {/* Destination Selection */}
      <div className="border border-mist/80 bg-canvas p-5 space-y-4">
        {scope === MEDIA_SCOPES.PRODUCT ? (
          <MediaProductSelector
            selectedProductId={productId}
            onSelectProduct={(id) => {
              setProductId(id);
              setFormError(null);
            }}
            disabled={uploadState !== "idle"}
            required
          />
        ) : (
          <div className="space-y-4">
            <MediaPlacementSelector
              selectedPlacement={placement}
              onSelectPlacement={(id) => {
                setPlacement(id);
                setFormError(null);
              }}
              disabled={uploadState !== "idle"}
            />

            {/* Campaign details */}
            <div className="grid gap-3 sm:grid-cols-3 border-t border-mist/70 pt-4">
              <div className="space-y-1">
                <label className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe" htmlFor="campaign-name">
                  Campaign Title
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  value={campaign}
                  disabled={uploadState !== "idle"}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="e.g. Festive Edit 2026"
                  className="w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe" htmlFor="campaign-start">
                  Start Date
                </label>
                <input
                  id="campaign-start"
                  type="date"
                  value={campaignStart}
                  disabled={uploadState !== "idle"}
                  onChange={(e) => setCampaignStart(e.target.value)}
                  className="w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe" htmlFor="campaign-end">
                  End Date
                </label>
                <input
                  id="campaign-end"
                  type="date"
                  value={campaignEnd}
                  disabled={uploadState !== "idle"}
                  onChange={(e) => setCampaignEnd(e.target.value)}
                  className="w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div className="space-y-2">
        <label className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe">
          Select Files <span className="text-accent">*</span>
        </label>
        <MediaUploadDropzone
          onFilesSelected={handleFilesSelected}
          disabled={uploadState !== "idle"}
        />
      </div>

      {/* File Validation Errors */}
      {fileErrors.length ? (
        <div
          role="alert"
          aria-live="assertive"
          className="border border-accent/40 bg-accent/[0.06] p-4 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-accent font-ui text-xs font-semibold">
            <AlertCircle size={14} />
            <span>Some files could not be added:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 font-ui text-[11px] text-accent">
            {fileErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Upload Queue */}
      <MediaUploadQueue
        queue={queue}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
        onClearQueue={handleClearQueue}
        isProductMedia={scope === MEDIA_SCOPES.PRODUCT}
        disabled={uploadState !== "idle"}
      />

      {/* Form Error */}
      {formError ? (
        <div
          role="alert"
          className="flex items-center gap-2 border border-accent/40 bg-accent/[0.05] p-3 text-accent font-ui text-xs"
        >
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      ) : null}

      {/* Upload Progress Bar (during mock upload) */}
      {uploadState !== "idle" && uploadState !== "completed" ? (
        <div className="border border-mist bg-surface/60 p-4 space-y-2">
          <div className="flex items-center justify-between font-ui text-xs">
            <span className="flex items-center gap-2 font-medium text-ink">
              <Loader2 size={14} className="animate-spin text-accent" />
              {uploadState === "preparing" ? "Preparing assets..." : "Uploading Demo Media..."}
            </span>
            <span className="font-mono text-taupe">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-mist overflow-hidden rounded-full">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="font-ui text-[10px] text-taupe">
            Validating headers, generating preview metadata, and recording provenance...
          </p>
        </div>
      ) : null}

      {/* Submission Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-mist/80 pt-6">
        <div className="font-ui text-xs text-taupe">
          {queue.length ? (
            <span>
              {queue.length} {queue.length === 1 ? "file" : "files"} ready to{" "}
              {isEmployeeSession ? "submit for review" : "upload"}
            </span>
          ) : (
            <span>No files selected</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <AtelierButton
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadState !== "idle"}
            onClick={() => navigate(-1)}
          >
            Cancel
          </AtelierButton>

          <AtelierButton
            type="submit"
            size="sm"
            disabled={uploadState !== "idle" || !queue.length || !isAuthorizedToUpload}
            className="min-w-36 bg-ink text-ivory hover:bg-cocoa"
          >
            {uploadState !== "idle" ? (
              <span className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                Uploading...
              </span>
            ) : isEmployeeSession ? (
              "Submit for Review"
            ) : (
              "Upload Media"
            )}
          </AtelierButton>
        </div>
      </div>
    </form>
  );
}
