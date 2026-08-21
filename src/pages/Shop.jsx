import { Link } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  EditorialHeading,
  MediaFrame,
  PageHeader,
  body,
  eyebrow,
  heading,
} from "../design-system";
import CatalogueBrowser from "../components/storefront/CatalogueBrowser";
import CategoryShortcuts from "../components/storefront/CategoryShortcuts";
import { collectionRoutes } from "../data/products/taxonomy";
import taxonomyRepository from "../services/taxonomyRepository";
import { categoryHref, collectionHref } from "../services/taxonomyRouting";
import { categoryCounts, products } from "../data/products";
import { resolveCategoryCover, resolveCollectionCover } from "../services/media/mediaResolver";
import { cn } from "../utils/cn";

/**
 * The shop — the front door of the catalogue.
 *
 * Reads as an issue of the house catalogue rather than a listing page: a
 * masthead, a featured edit, the categories as imagery, and only then the
 * grid with its controls.
 *
 * It owns none of the discovery logic; `CatalogueBrowser` does, unscoped.
 */

/** The six categories offered as shortcuts, in merchandising order. */
const SHORTCUT_ORDER = ["sarees", "lehengas", "the-bride", "finishing-touches", "ethnic-wear", "girls"];

export default function Shop() {
  const activeCategories = taxonomyRepository.activeCategories();
  const shortcuts = SHORTCUT_ORDER.map((id) => {
    const category = activeCategories.find((entry) => entry.id === id);
    if (!category) return null;
    /* The destination is the category's managed slug, never a copied route. */
    const to = categoryHref(category);
    if (!to) return null;
    return {
      to,
      label: category.name,
      eyebrow: category.eyebrow,
      image: resolveCategoryCover(category),
      count: categoryCounts[id] ?? 0,
    };
  }).filter(Boolean);

  const featured = collectionRoutes.featured;
  const featuredImage = resolveCollectionCover(featured);
  const featuredHref = collectionHref(taxonomyRepository.findCollection("featured")) ?? "/collections/featured";
  const featuredCount = products.filter((product) => product.isFeatured).length;

  return (
    <>
      <PageHeader
        eyebrow="The Collection"
        title={
          <>
            Every piece in
            <br />
            the <span className="italic text-accent">atelier</span>
          </>
        }
        description="Sarees woven in Odisha and Banaras, bridal couture made to order, jewellery finished by hand — the full house catalogue, in one place."
        breadcrumb={[{ label: "Shop" }]}
        size="section"
      />

      {/* Featured edit */}
      <AtelierSection rhythm="none" width="wide" className="pb-20 md:pb-28">
        <Link to={featuredHref} className="group grid gap-8 md:grid-cols-12 md:items-center">
          <MediaFrame
            image={featuredImage}
            alt={featured.title}
            aspect="panorama"
            zoom="soft"
            surface
            overlay="inkLeft"
            className="md:col-span-7"
          />

          <div className="md:col-span-5">
            <EditorialHeading
              as="h2"
              size="subsection"
              eyebrow={featured.eyebrow}
              description={featured.description}
              descriptionClassName={cn(body.editorial, "text-graphite max-w-md")}
              rule
              spacing={{ eyebrow: "mb-4", title: "mb-5", rule: "mb-6" }}
            >
              {featured.title}
            </EditorialHeading>

            <p className={cn(eyebrow.label, "text-brass mt-8 group-hover:text-accent transition-colors")}>
              {`View all ${featuredCount} pieces →`}
            </p>
          </div>
        </Link>
      </AtelierSection>

      {/* Category shortcuts */}
      <AtelierSection tone="fade" rhythm="compact" width="wide">
        <EditorialHeading
          as="h2"
          size="subsection"
          eyebrow="Where to Begin"
          spacing={{ eyebrow: "mb-4", title: "mb-12" }}
        >
          Shop by <span className="italic text-accent">category</span>
        </EditorialHeading>

        <CategoryShortcuts items={shortcuts} />
      </AtelierSection>

      {/* The grid */}
      <AtelierSection rhythm="default" width="wide" id="catalogue">
        <div className="mb-12 md:mb-16">
          <h2 className={cn(heading.xl, "mb-3")}>
            The full <span className="italic text-accent">catalogue</span>
          </h2>
          <p className={cn(body.base, "text-taupe max-w-lg")}>
            Filter by fabric, occasion, colour or price — or simply scroll.
          </p>
        </div>

        <CatalogueBrowser
          emptyAction={
            <AtelierButton as={Link} to="/collections/new-arrivals" variant="outline" size="md">
              See New Arrivals
            </AtelierButton>
          }
        />
      </AtelierSection>
    </>
  );
}
