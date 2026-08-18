import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { imageRef } from "../../data/mediaPlaceholder";
import { MARKETING_PLACEMENTS } from "../../config/mediaTypes";
import { useActivePlacementMedia } from "../../hooks/useMedia";
import { usePlacementEntries } from "../../hooks/useMarketingPlacements";
import { resolvePlacementImage } from "../../services/media/marketingMediaSource";
import { resolveEditorialFrame } from "../../services/media/mediaResolver";
import { getLiveStorefrontProducts } from "../../data/products";
import { resolveCategoryRoute } from "../../services/taxonomyRouting";
import { AtelierButton, AtelierSection, MediaFrame, body, eyebrow, heading } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * A compact editorial seam within the home page, not a category grid.
 *
 * Only the editorial copy (numbers, labels, titles) lives here. Each edit's
 * destination resolves from its managed category via `resolveCategoryRoute`,
 * and each plate resolves through the central media resolver with an
 * EDITORIAL usage — never a hand-written route or a hardcoded image path.
 */
const edits = [
  {
    id: "bridal",
    number: "01",
    label: "Bridal Edit",
    title: "Pieces created for moments you'll remember forever.",
    shortTitle: "The bridal edit",
    categoryId: "the-bride",
    image: null,
  },
  {
    id: "groom",
    number: "02",
    label: "Groom Edit",
    title: "Considered ceremonial dressing, tailored for the occasion.",
    shortTitle: "The ceremony edit",
    categoryId: "groom",
    image: null,
  },
  {
    id: "festive",
    number: "03",
    label: "Festive Edit",
    title: "Festive silhouettes with a contemporary soul.",
    shortTitle: "Made to celebrate",
    categoryId: "sarees",
    image: null,
  },
  {
    id: "heritage",
    number: "04",
    label: "Heritage Edit",
    title: "Craft, colour and stories woven into every piece.",
    shortTitle: "Woven for generations",
    categoryId: "sarees",
    image: null,
  },
];

export default function CelebrationEdit({ excludeIds = null }) {
  const [activeId, setActiveId] = useState("bridal");
  /* The Festive edit resolves through the canonical Marketing Media product
     workflow — the FESTIVE_SECTION placement holds a canonical Product ID,
     the live catalogue resolves it (PUBLISHED only), and that product's
     primary media stands. With no curated, published product it shows its
     legitimate empty state — never a static catalogue plate. */
  const festiveEntries = usePlacementEntries(
    MARKETING_PLACEMENTS.FESTIVE_SECTION,
    getLiveStorefrontProducts()
  );
  /* The EDITORIAL placement owns the heritage storytelling plate — the one
     frame without a frame-specific marketing seam. An ACTIVE record stands
     in for the artwork exactly the way the festive record does; anything
     else (no record, draft, archived, no usable file) leaves the house's
     deterministic editorial frame where it is. */
  const editorialMedia = useActivePlacementMedia(MARKETING_PLACEMENTS.EDITORIAL);
  const activeEdit = edits.find((edit) => edit.id === activeId) ?? edits[0];
  const usedIds = new Set(excludeIds ?? []);

  const themeFor = (id) =>
    ({ bridal: "bridal", groom: "groom", festive: "festive", heritage: "heritage" }[id] || "festive");

  const images = Object.fromEntries(
    edits.map((edit) => {
      const resolved =
        edit.id === "festive"
          ? festiveEntries[0]?.image || imageRef(edit.image)
          : edit.id === "heritage"
            ? resolvePlacementImage(editorialMedia, resolveEditorialFrame("heritage", usedIds) || imageRef(edit.image))
            : resolveEditorialFrame(themeFor(edit.id), usedIds) || imageRef(edit.image);
      return [edit.id, resolved];
    })
  );
  const resolveImage = (edit) => images[edit.id] || imageRef(edit.image);

  const editRoute = (edit) => resolveCategoryRoute(edit.categoryId)?.href ?? "/shop";

  return (
    <AtelierSection id="bridal" rhythm="none" width="wide" className="py-20 md:py-28">
      <header className="mb-9 md:mb-10">
        <p className={cn(eyebrow.section, "text-accent mb-3")}>The PRATIKSHYA Edit</p>
        <h2 className="font-display text-[2.4rem] leading-[.95] font-light tracking-tight md:text-5xl">
          Celebration, composed <span className="italic text-accent">in every detail.</span>
        </h2>
      </header>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.58fr)_minmax(17rem,.72fr)] lg:items-end">
        <div>
          <div className="relative overflow-hidden bg-surface aspect-[3/2] md:aspect-[16/9]">
            <MediaFrame
              key={activeEdit.id}
              image={resolveImage(activeEdit)}
              alt={resolveImage(activeEdit).alt || activeEdit.label}
              aspect="panorama"
              imageClassName="motion-safe:animate-[edit-fade_450ms_ease-out]"
              className="h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setActiveId("bridal")}
              aria-label="Show Bridal Edit as the featured story"
              className="absolute bottom-4 right-5 font-ui text-[10px] tracking-[.25em] text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:bottom-6 md:right-7"
            >
              {activeEdit.number} / 04
            </button>
          </div>

          <div className="pt-5 md:flex md:items-end md:justify-between md:gap-8">
            <div>
              <p className={cn(eyebrow.editorial, "text-accent mb-2")}>{activeEdit.label}</p>
              <h3 className={cn(heading.lg, "max-w-xl leading-[1.05]")}>{activeEdit.title}</h3>
            </div>
            <AtelierButton as={Link} to={editRoute(activeEdit)} variant="outline" size="md" className="mt-5 shrink-0 md:mt-0">
              Explore {activeEdit.label.replace(" Edit", "")} <ArrowUpRight size={15} aria-hidden="true" />
            </AtelierButton>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-1">
          {edits.slice(1).map((edit) => {
            const isActive = activeId === edit.id;
            return (
              <button
                key={edit.id}
                type="button"
                onClick={() => setActiveId(edit.id)}
                aria-label={`Show ${edit.label} as the featured story`}
                aria-pressed={isActive}
                className={cn(
                  "group text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
                  isActive && "lg:translate-x-1"
                )}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface lg:aspect-[2/1]">
                  <MediaFrame image={resolveImage(edit)} alt="" aspect="portrait" zoom="soft" className="h-full w-full" />
                  <span className="absolute left-3 top-3 font-ui text-[9px] tracking-[.2em] text-white drop-shadow-sm">{edit.number}</span>
                </div>
                <div className="flex items-start justify-between gap-2 border-b border-mist py-3 transition-transform duration-300 group-hover:translate-x-1">
                  <div>
                    <p className={cn(eyebrow.editorial, "text-accent mb-1")}>{edit.label}</p>
                    <p className={cn(body.caption, "text-graphite leading-snug")}>{edit.shortTitle}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={15} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AtelierSection>
  );
}
