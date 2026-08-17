import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MediaFrame, body, eyebrow, gap, heading, useReveal } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * The category strip.
 *
 * Imagery first: each shortcut is a portrait plate with the category name
 * beneath it, in the same treatment the landing page gives its collection
 * tiles. It scrolls horizontally on a phone rather than wrapping into a
 * cramped grid.
 */
export default function CategoryShortcuts({ items, className = "" }) {
  const reveal = useReveal();

  return (
    <motion.div {...reveal} className={className}>
      <ul
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto pb-2",
          "sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6",
          gap.tile
        )}
      >
        {items.map((item) => (
          <li key={item.to} className="w-36 shrink-0 snap-start sm:w-auto">
            <Link to={item.to} className="group block">
              <MediaFrame
                image={item.image}
                alt={item.label}
                aspect="portrait"
                zoom="strong"
                surface
                overlay="imageBottom"
                className="mb-3"
              />
              <h3 className={cn(heading.product, "leading-tight")}>{item.label}</h3>
              {item.count ? (
                <p className={cn(body.micro, "text-taupe mt-1")}>{`${item.count} pieces`}</p>
              ) : (
                <p className={cn(eyebrow.label, "text-brass mt-1")}>{item.eyebrow}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
