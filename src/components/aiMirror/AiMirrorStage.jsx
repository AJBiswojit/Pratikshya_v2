import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import PratikshyaImage from "../PratikshyaImage";
import { imageRef } from "../../data/mediaPlaceholder";
import { cn } from "../../utils/cn";

const statusCopy = {
  idle: {
    title: "Step into the mirror",
    body: "Enable your camera for a live view, or begin with the curated preview scene.",
  },
  requesting: {
    title: "Preparing your mirror…",
    body: "Waiting for camera permission. No microphone is requested.",
  },
  denied: {
    title: "Camera access is unavailable",
    body: "You can still explore the demo mirror using our preview mode.",
  },
  unavailable: {
    title: "Camera access is unavailable",
    body: "This browser or device cannot start a camera here. The preview experience is ready instead.",
  },
};

function StageBadge({ live, result }) {
  const label = live && !result ? "LIVE CAMERA" : "DEMO PREVIEW";
  return (
    <span className="inline-flex items-center gap-2 border border-white/25 bg-ink/45 px-3 py-2 font-ui text-[9px] uppercase tracking-[.2em] text-ivory backdrop-blur-md">
      <span className={cn("h-1.5 w-1.5 rounded-full", live && !result ? "bg-gold" : "bg-blush")} aria-hidden="true" />
      {label}
    </span>
  );
}

function StatusPanel({ status, onEnableCamera, onUsePreviewMode }) {
  const copy = statusCopy[status];
  if (!copy) return null;

  const requesting = status === "requesting";
  const unavailable = status === "denied" || status === "unavailable";

  return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/32 p-5 backdrop-blur-[2px]">
        <div className="max-w-sm border border-white/25 bg-ink/78 p-6 text-center text-ivory shadow-2xl shadow-black/20 sm:p-8">
        <div className="mx-auto flex h-11 w-11 items-center justify-center border border-gold/70 text-gold">
          {requesting ? (
            <RefreshCw size={19} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : unavailable ? (
            <CameraOff size={19} strokeWidth={1.4} aria-hidden="true" />
          ) : (
            <Camera size={19} strokeWidth={1.4} aria-hidden="true" />
          )}
        </div>
        <p role="status" aria-live="polite" className="mt-5 font-display text-3xl font-light leading-none sm:text-4xl">{copy.title}</p>
        <p className="mx-auto mt-3 max-w-xs font-ui text-xs leading-relaxed text-ash">{copy.body}</p>
        {requesting ? (
          <p className="mt-5 font-ui text-[9px] uppercase tracking-[.2em] text-gold">Camera permission in progress</p>
        ) : unavailable ? (
          <button
            type="button"
            onClick={onUsePreviewMode}
            className="mt-6 inline-flex items-center gap-2 bg-ivory px-5 py-3 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
          >
            <Sparkles size={14} aria-hidden="true" />
            Use Preview Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnableCamera}
            className="mt-6 inline-flex items-center gap-2 bg-ivory px-5 py-3 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:bg-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
          >
            <Camera size={14} aria-hidden="true" />
            Enable Camera
          </button>
        )}
      </div>
    </div>
  );
}

/** The visual heart of the AI Mirror page. Camera stream ownership stays in the page. */
export default function AiMirrorStage({
  cameraStatus,
  videoRef,
  selectedProduct,
  previewTemplate,
  result,
  comparison,
  onComparisonChange,
  onEnableCamera,
  onUsePreviewMode,
  onStopCamera,
  isProcessing,
  processingState,
}) {
  const canCompare = Boolean(result?.previewImage && result?.originalImage);
  const showTryOn = canCompare && comparison === "try-on" && !isProcessing;
  const liveOriginal = cameraStatus === "active" && !showTryOn;
  const stageImage = showTryOn
    ? result.previewImage
    : previewTemplate?.originalImage ?? selectedProduct?.image ?? imageRef("saree-cotton");
  const status = statusCopy[cameraStatus] ? cameraStatus : null;
  const activeLabel = showTryOn ? "Your Look" : liveOriginal ? "Original live view" : "Original preview";

  return (
    <section aria-labelledby="ai-mirror-stage-heading" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">Your mirror</p>
          <h2 id="ai-mirror-stage-heading" className="mt-1 font-display text-3xl font-light text-ink sm:text-4xl">
            {showTryOn ? <>Your <span className="italic text-accent">look</span></> : <>A place to <span className="italic text-accent">see</span></>}
          </h2>
        </div>
        <p className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">Preview experience</p>
      </div>

      <div
        className="relative isolate min-h-[31rem] overflow-hidden border border-ink/15 bg-ink sm:min-h-[38rem] lg:min-h-[43rem]"
        aria-describedby="ai-mirror-camera-description"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={liveOriginal ? "live" : showTryOn ? `look-${result?.id}` : `original-${selectedProduct?.id || "default"}`}
            initial={{ opacity: 0.45, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.35 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {liveOriginal ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label="Live camera preview for the PRATIKSHYA AI Mirror"
                aria-describedby="ai-mirror-camera-description"
                className="h-full w-full object-cover [-webkit-transform:scaleX(-1)] [transform:scaleX(-1)]"
              />
            ) : (
              <PratikshyaImage
                image={stageImage}
                alt={
                  showTryOn
                    ? `${selectedProduct?.name || "Selected apparel"} in a curated AI Mirror demo preview`
                    : "Curated customer preview scene for the PRATIKSHYA AI Mirror"
                }
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/20" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7%] inset-y-[5%] border border-white/15" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[9%] top-[7%] h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />

        <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <StageBadge live={cameraStatus === "active"} result={showTryOn} />
        </div>

        {selectedProduct ? (
          <div className="absolute bottom-5 left-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-3 border border-white/20 bg-ink/62 p-2 pr-4 text-ivory backdrop-blur-md sm:bottom-6 sm:left-6 sm:max-w-sm">
            <div className="h-14 w-11 shrink-0 overflow-hidden bg-white/10">
              <PratikshyaImage
                image={selectedProduct.image}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                sizes="44px"
              />
            </div>
            <div className="min-w-0">
              <p className="font-ui text-[8px] uppercase tracking-[.18em] text-gold">Selected look</p>
              <p className="mt-1 truncate font-display text-lg leading-none">{selectedProduct.name}</p>
              {showTryOn && result?.mood ? <p className="mt-1 font-ui text-[10px] text-ash">{result.mood}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="absolute bottom-5 right-4 z-10 text-right sm:bottom-6 sm:right-6">
          <p className="font-ui text-[9px] uppercase tracking-[.17em] text-white/80">{activeLabel}</p>
          {showTryOn ? <p className="mt-1 font-ui text-[10px] text-gold">{result?.label || "AI Mirror Preview"} · demo imagery</p> : null}
        </div>

        <AnimatePresence>
          {isProcessing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-ink/72 p-6 backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <div className="max-w-xs text-center text-ivory">
                <div className="relative mx-auto h-16 w-16">
                  <span className="absolute inset-0 border border-gold/70 animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
                  <span className="absolute inset-2 border border-white/40 animate-[spin_4s_linear_infinite_reverse] motion-reduce:animate-none" />
                  <Sparkles className="absolute inset-0 m-auto text-gold" size={20} aria-hidden="true" />
                </div>
                <p className="mt-6 font-display text-3xl font-light">{processingState?.message || "Creating your look"}</p>
                <p className="mt-3 font-ui text-xs leading-relaxed text-ash">
                  {processingState?.detail || "Preparing the fit and styling preview…"}
                </p>
                <p className="mt-5 font-ui text-[9px] uppercase tracking-[.2em] text-gold">Demo preview in progress</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {status ? <StatusPanel status={status} onEnableCamera={onEnableCamera} onUsePreviewMode={onUsePreviewMode} /> : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 border border-mist/80 bg-surface/35 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {canCompare ? (
          <div className="inline-flex self-start border border-mist bg-canvas p-1" role="group" aria-label="Preview comparison">
            <button
              type="button"
              onClick={() => onComparisonChange("original")}
              aria-pressed={comparison === "original"}
              className={cn(
                "px-3 py-2 font-ui text-[9px] uppercase tracking-[.15em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                comparison === "original" ? "bg-ink text-ivory" : "text-taupe hover:text-ink"
              )}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => onComparisonChange("try-on")}
              aria-pressed={comparison === "try-on"}
              className={cn(
                "px-3 py-2 font-ui text-[9px] uppercase tracking-[.15em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                comparison === "try-on" ? "bg-ink text-ivory" : "text-taupe hover:text-ink"
              )}
            >
              Your Look
            </button>
          </div>
        ) : (
          <p className="font-ui text-[10px] text-taupe">Choose a look, then create a demo preview to compare it here.</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {cameraStatus === "active" ? (
            <button
              type="button"
              onClick={onStopCamera}
              className="inline-flex items-center gap-2 font-ui text-[9px] uppercase tracking-[.15em] text-accent hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              <CameraOff size={13} aria-hidden="true" />
              Turn camera off
            </button>
          ) : cameraStatus === "preview" ? (
            <button
              type="button"
              onClick={onEnableCamera}
              className="inline-flex items-center gap-2 font-ui text-[9px] uppercase tracking-[.15em] text-accent hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              <Camera size={13} aria-hidden="true" />
              Enable camera
            </button>
          ) : null}
          <span className="inline-flex items-center gap-2 font-ui text-[10px] text-taupe">
            <ShieldCheck size={14} className="text-accent" aria-hidden="true" />
            Your camera is used only for this preview experience.
          </span>
        </div>
      </div>
      <p id="ai-mirror-camera-description" className="mt-2 font-ui text-[10px] leading-relaxed text-taupe">
        Camera access can be turned off at any time. PRATIKSHYA does not upload, store or save camera frames in this demo.
      </p>
    </section>
  );
}
