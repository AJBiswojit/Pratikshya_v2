import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PratikshyaImage from "../PratikshyaImage";
import { cn } from "../../utils/cn";

/**
 * PRATIKSHYA FASHON — Video plate.
 *
 * Native HTML5 video, no player library. The browser's own control bar
 * carries play, pause, mute, scrubbing and fullscreen, which is both the
 * lightest option and the most accessible one.
 *
 * House behaviour:
 *   · `preload="metadata"` — a poster and a duration, never the whole file
 *   · nothing autoplays, so two videos can never speak at once
 *   · the poster is a still plate until the viewer chooses to play
 *   · a video that cannot load falls back to its poster, not a black box
 */
export default function MediaVideo({
  src,
  poster = "",
  posterImage = null,
  title = "Video",
  className = "",
  objectFit = "cover",
  onPlay,
}) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  /* A new source is a new plate: back to the poster, nothing playing. */
  useEffect(() => {
    setStarted(false);
    setFailed(false);
  }, [src]);

  const begin = () => {
    setStarted(true);
    onPlay?.();
    /* The element exists on the next paint; play once it does. */
    requestAnimationFrame(() => {
      videoRef.current?.play?.().catch(() => {
        /* A refused play is not an error worth showing — the control bar
           is right there and the viewer can press it themselves. */
      });
    });
  };

  const plate = posterImage ?? (poster ? { src: poster, alt: title } : null);

  if (!src || failed) {
    return (
      <div className={cn("relative flex h-full w-full items-center justify-center bg-ink", className)}>
        {plate ? (
          <PratikshyaImage image={plate} alt={title} className="h-full w-full object-cover opacity-70" />
        ) : null}
        <p className="absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-2 text-center font-ui text-[10px] uppercase tracking-[.16em] text-ivory">
          {failed ? "Video unavailable" : "No video source"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full bg-ink", className)}>
      {started ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          controls
          controlsList="nodownload"
          preload="metadata"
          playsInline
          onError={() => setFailed(true)}
          aria-label={title}
          className={cn("h-full w-full", objectFit === "contain" ? "object-contain" : "object-cover")}
        />
      ) : (
        <>
          {plate ? (
            <PratikshyaImage image={plate} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-ink" />
          )}
          <button
            type="button"
            onClick={begin}
            aria-label={`Play ${title}`}
            className="group absolute inset-0 flex items-center justify-center bg-ink/25 transition-colors hover:bg-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ivory"
          >
            <span className="flex h-14 w-14 items-center justify-center border border-ivory/70 bg-ink/50 text-ivory transition-colors group-hover:bg-accent group-hover:border-accent">
              <Play size={20} strokeWidth={1.4} aria-hidden="true" />
            </span>
          </button>
        </>
      )}
    </div>
  );
}
