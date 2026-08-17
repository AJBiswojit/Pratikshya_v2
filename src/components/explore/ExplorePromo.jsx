import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MediaFrame, body, duration, eyebrow, heading, transition } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * Compact advertisement / editorial insert.
 *
 * Imagery is supplied by the Explore placement resolver (SALE / HERO /
 * EDITORIAL / COLLECTION roles). Product plates are never used as ads.
 */
export default function ExplorePromo({
  image,
  eyebrow: eyebrowText,
  title,
  description,
  to = "/explore",
  cta = "View the edit",
  tone = "promo",
}) {
  if (!image) return null;

  const dark = tone === "promo";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: duration.page }}
      className="col-span-full"
    >
      <Link
        to={to}
        className={cn(
          "group grid overflow-hidden md:grid-cols-12",
          dark ? "bg-ink text-ivory" : "border border-mist/80 bg-canvas-deep/50",
          transition.all
        )}
      >
        <MediaFrame
          image={image}
          alt={title}
          aspect="landscape"
          zoom="soft"
          className="md:col-span-5 min-h-[9rem] md:min-h-[11rem]"
        />
        <div className="flex flex-col justify-center px-5 py-5 md:col-span-7 md:px-8">
          {eyebrowText ? (
            <p className={cn(eyebrow.label, dark ? "text-gold mb-2" : "text-accent mb-2")}>
              {eyebrowText}
            </p>
          ) : null}
          <h3 className={cn(heading.sm, "mb-2")}>{title}</h3>
          {description ? (
            <p className={cn(body.caption, dark ? "text-ash max-w-md" : "text-taupe max-w-md")}>
              {description}
            </p>
          ) : null}
          <p
            className={cn(
              eyebrow.label,
              "mt-4",
              dark ? "text-gold group-hover:text-ivory" : "text-brass group-hover:text-accent",
              transition.colors
            )}
          >
            {cta} →
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
