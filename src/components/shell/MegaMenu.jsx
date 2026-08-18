import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Container,
  MediaFrame,
  body,
  duration,
  eyebrow,
  gap,
  heading,
  transition,
} from "../../design-system";
import { resolveNavigationEditorialImage } from "../../services/media/navigationEditorialMedia";
import { cn } from "../../utils/cn";

/**
 * The panel that drops beneath a primary navigation group.
 *
 * Composed like an editorial spread rather than a list of links: the
 * group's columns on the left, one image-led feature on the right. It
 * borrows the section eyebrow, the display heading and the standard image
 * frame, so the menu reads as part of the same publication as the page
 * behind it.
 *
 * The feature's plate is DATA-DRIVEN. This component authors no image, no
 * filename and no product id: it asks `navigationEditorialMedia` for the
 * plate belonging to the group currently open, and that module resolves it
 * from the canonical taxonomy, the curated marketing placements and the
 * canonical catalogue. A group with nothing eligible resolves to `null` and
 * the frame keeps its neutral placeholder rather than borrowing another
 * department's photograph.
 *
 * Desktop only — the mobile drawer covers the same information architecture.
 */
export default function MegaMenu({ id, group, onNavigate, ...rest }) {
  const editorial = resolveNavigationEditorialImage(group);

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: duration.page, ease: "easeOut" }}
      className="hidden lg:block absolute left-0 right-0 top-full bg-canvas border-b border-mist/50 shadow-2xl shadow-ink/10"
      {...rest}
    >
      <Container width="content" padded className="grid grid-cols-12 gap-10 py-12">
        {/* Columns */}
        <div className="col-span-8 grid grid-cols-3 gap-8">
          {group.columns.map((column) => (
            <div key={column.title}>
              <h3 className={cn(eyebrow.label, "text-taupe mb-5")}>{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={onNavigate}
                      className={cn(
                        body.caption,
                        "text-graphite hover:text-accent",
                        transition.colors
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Feature */}
        <Link
          to={group.feature.to}
          onClick={onNavigate}
          className={cn("col-span-4 group block", gap.chip)}
        >
          <MediaFrame
            image={editorial ?? group.feature.image}
            alt={editorial?.alt ?? group.feature.caption}
            aspect="portrait"
            zoom="soft"
            className="mb-4"
            imageProps={{
              /* The panel opens on hover — its plate is never the LCP. */
              loading: "lazy",
              decoding: "async",
              objectPosition: editorial?.objectPosition,
            }}
          />
          <p className={cn(eyebrow.editorial, "text-accent mb-2")}>{group.feature.eyebrow}</p>
          <h3 className={cn(heading.product, "mb-1")}>{group.feature.title}</h3>
          <p className={cn(body.caption, "text-taupe mb-3")}>{group.feature.caption}</p>
          <span
            className={cn(
              eyebrow.label,
              "inline-flex items-center gap-2 text-brass group-hover:text-accent",
              transition.colors
            )}
          >
            View the edit
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        </Link>
      </Container>
    </motion.div>
  );
}
