import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accent,
  AtelierSection,
  EditorialHeading,
  MediaFrame,
  Rule,
  eyebrow,
  gap,
  useReveal,
} from "../../design-system";
import { departments as canonicalDepartments } from "../../data/catalog/taxonomy";
import { resolveCategoryCover } from "../../services/media/mediaResolver";
import taxonomyRepository from "../../services/taxonomyRepository";
import { categoryHref } from "../../services/taxonomyRouting";
import { cn } from "../../utils/cn";

/**
 * SHOP BY CATEGORY — landing section.
 *
 * Every ACTIVE managed category becomes one card. The card reads its name,
 * slug, sort order and featured state from the central taxonomyRepository,
 * its route from that slug (`taxonomyRouting.categoryHref`) and its plate
 * from the central mediaResolver — nothing here hard-codes a category, a
 * route or a picture. A category archived or renamed in the Admin Portal
 * simply drops out, and a category added there appears here automatically
 * (the presentation groups only label rows; any category they do not mention
 * is appended under its own heading).
 */

/** Presentation groups are projected directly from canonical departments. */
const CATEGORY_GROUPS = canonicalDepartments.map((department) => ({
  id: department.id,
  label: department.name,
  categories: department.categories.map((category) => category.id),
}));

const byOrder = (a, b) =>
  a.sortOrder - b.sortOrder || Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);

const categoryCard = (category, usedIds) => ({
  key: `category-${category.id}`,
  to: categoryHref(category),
  name: category.name,
  eyebrow: category.eyebrow || "",
  featured: category.featured,
  image: resolveCategoryCover(category, usedIds),
  alt: `${category.name} collection at PRATIKSHYA FASHON`,
});

export default function ShopByCategory({ excludeIds = null }) {
  const reveal = useReveal();
  const usedIds = new Set(excludeIds ?? []);

  const active = taxonomyRepository.activeCategories();
  const activeById = new Map(active.map((category) => [category.id, category]));

  const groupedIds = new Set();
  const groups = CATEGORY_GROUPS.map((group) => {
    const cards = (group.categories ?? [])
      .map((id) => activeById.get(id))
      .filter(Boolean)
      .sort(byOrder)
      .map((category) => {
        groupedIds.add(category.id);
        return categoryCard(category, usedIds);
      });
    return { ...group, cards };
  }).filter((group) => group.cards.length > 0);

  /* An ACTIVE category the presentation groups don't mention still appears,
     so a future category reaches the homepage without any JSX change — but
     only when it can resolve a real plate. */
  const remainder = active.filter(
    (category) => !groupedIds.has(category.id) && Boolean(resolveCategoryCover(category)?.src)
  );
  if (remainder.length > 0) {
    groups.push({
      id: "more",
      label: "More from the Atelier",
      cards: remainder.sort(byOrder).map((category) => categoryCard(category, usedIds)),
    });
  }

  if (!groups.length) return null;

  return (
    <AtelierSection id="shop-by-category">
      <EditorialHeading
        eyebrow="The Atelier"
        size="subsection"
        spacing={{ eyebrow: "mb-4", title: "mb-14" }}
      >
        Shop by <Accent>Category</Accent>
      </EditorialHeading>

      <div className="space-y-16 md:space-y-24">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`shop-by-category-${group.id}`}>
            <div className="mb-6 md:mb-8">
              <h3 id={`shop-by-category-${group.id}`} className={cn(eyebrow.section, "text-accent")}>
                {group.label}
              </h3>
              <Rule width="w-16" tone="accent" className="mt-3" />
            </div>

            <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5", gap.tile)}>
              {group.cards.map((card, index) => (
                <motion.div
                  key={card.key}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: Math.min(index % 5, 4) * 0.05 }}
                >
                  <Link
                    to={card.to}
                    className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <MediaFrame
                      image={card.image}
                      alt={card.alt}
                      aspect="portrait"
                      zoom="soft"
                      overlay="imageBottom"
                      className="mb-4 md:mb-5"
                    >
                      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-left">
                        {card.eyebrow ? (
                          <p className={cn(eyebrow.label, "text-ivory/80 mb-1")}>
                            {card.eyebrow}
                          </p>
                        ) : null}
                        <h4 className="font-display text-xl md:text-2xl font-light leading-tight text-white">
                          {card.name}
                        </h4>
                        <span className="mt-2 inline-flex items-center gap-1.5 font-ui text-[9px] uppercase tracking-[.2em] text-pearl transition-colors group-hover:text-white">
                          Shop Now
                          <ArrowRight
                            size={11}
                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                          />
                        </span>
                      </div>
                    </MediaFrame>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AtelierSection>
  );
}
