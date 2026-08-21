/**
 * PRATIKSHYA FASHON — Product-first catalogue listing page.
 *
 * Every browsable product listing renders through this one page:
 *   · /category/:slug         (managed categories)
 *   · /collection/:slug       (managed collections)
 *   · navigation paths        (/women, /men, /bridal, /kids, /women/sarees,
 *                              /kids/boys, /collections/new-arrivals, etc.)
 *
 * Layout is SHOPPING-FIRST:
 *
 *   NAVBAR
 *   → Compact breadcrumb
 *   → Compact category header (eyebrow, title, short description)
 *   → Category tabs (sibling subcategories from canonical taxonomy)
 *   → Filter / sort toolbar (dynamic product count)
 *   → Product grid
 *   → Optional curated marketing rails (rendered AFTER the catalogue so
 *     they never push products below the fold)
 *
 * The giant panorama editorial hero that previously occupied most of the
 * first viewport is removed. Editorial artwork remains accessible on
 * dedicated marketing pages and the homepage, not on catalogue pages.
 */

import { Link, useLocation, useParams } from "react-router-dom";
import { AtelierButton, AtelierSection } from "../design-system";
import CatalogueBrowser from "../components/storefront/CatalogueBrowser";
import CatalogueHeader from "../components/storefront/CatalogueHeader";
import CategoryTabs from "../components/storefront/CategoryTabs";
import PlacementProductRail from "../components/storefront/PlacementProductRail";
import {
  categoryRoutes,
  collectionRoutes,
  resolveNavigationScope,
} from "../data/products/taxonomy";
import { collectionPlates } from "../data/catalog/collections";
import taxonomyRepository from "../services/taxonomyRepository";
import { listingPlacementsForScope } from "../services/marketing/categoryPlacementSurfaces";
import { getRouteMeta } from "../config/navigationConfig";
import NotFound from "./NotFound";

export default function CatalogueListing({ variant }) {
  const params = useParams();
  const { pathname } = useLocation();

  /* --- resolve the canonical scope -------------------------------- */

  let scope = null;

  if (variant === "category") {
    scope = categoryRoutes[params.slug] ?? null;
    if (!scope) {
      const category = taxonomyRepository.findCategory(params.slug);
      if (category?.status === "ACTIVE") {
        scope = {
          id: category.id,
          title: category.name,
          eyebrow: category.eyebrow || "Category",
          description: category.description,
          filters: { category: category.id },
        };
      }
    }
  } else if (variant === "collection") {
    scope = collectionRoutes[params.slug] ?? null;
    if (!scope) {
      const collection = taxonomyRepository.findCollection(params.slug);
      if (collection && (collection.displayStatus === "ACTIVE" || collection.status === "ACTIVE")) {
        scope = {
          id: collection.id,
          title: collection.name,
          eyebrow: collection.eyebrow || "Collection",
          description: collection.description,
          filters: { collectionId: collection.id },
          breadcrumb: [
            { label: "Collections", to: "/collections" },
            { label: collection.name },
          ],
        };
      }
    }
  } else {
    // A Phase 3 navigation path (/women, /kids/boys, /collections/...).
    const nav = resolveNavigationScope(pathname);
    const meta = getRouteMeta(pathname);
    const collectionSlug = pathname.startsWith("/collections/")
      ? pathname.slice("/collections/".length)
      : "";
    const collectionRecord = collectionSlug
      ? taxonomyRepository.findCollection(collectionSlug)
      : null;
    const plate = collectionSlug
      ? collectionPlates[collectionSlug] ??
        collectionPlates[collectionRecord?.id]
      : null;

    if (collectionRecord && collectionRecord.displayStatus !== "ACTIVE" && collectionRecord.status !== "ACTIVE") {
      scope = null;
    } else if (nav || collectionRecord) {
      const filters =
        nav?.filters ??
        (collectionRecord
          ? { collectionId: collectionRecord.id }
          : null);
      if (filters) {
        const title =
          collectionRecord?.name ??
          plate?.name ??
          nav?.title ??
          meta?.label ??
          collectionSlug;
        scope = {
          id: collectionRecord?.id ?? plate?.id ?? null,
          title,
          eyebrow:
            collectionRecord?.eyebrow || plate?.eyebrow || meta?.eyebrow || "Collection",
          description:
            collectionRecord?.description ??
            plate?.description ??
            meta?.description ??
            "",
          filters,
          breadcrumb: collectionSlug
            ? [
                { label: "Collections", to: "/collections" },
                { label: title },
              ]
            : meta?.breadcrumb,
        };
      }
    }
  }

  if (variant === "category" && scope) {
    const currentCategory =
      taxonomyRepository.findCategory(params.slug) ||
      taxonomyRepository.findCategory(scope.id);
    if (currentCategory?.status !== "ACTIVE") scope = null;
  }
  if (variant === "collection" && scope) {
    const currentCollection =
      taxonomyRepository.findCollection(params.slug) ||
      taxonomyRepository.findCollection(scope.id);
    if (currentCollection?.displayStatus !== "ACTIVE") scope = null;
  }

  if (!scope) return <NotFound />;

  const breadcrumb =
    scope.breadcrumb?.length > 0
      ? scope.breadcrumb
      : [
          variant === "collection"
            ? { label: "Collections", to: "/collections" }
            : { label: "Shop", to: "/shop" },
          { label: scope.title },
        ];

  // Curated marketing rails — resolved through the canonical placement
  // system. Rendered AFTER the main catalogue grid so the editorial
  // content never pushes products below the fold.
  const curatedRailPlacements = listingPlacementsForScope(scope.filters);

  return (
    <>
      <CatalogueHeader
        eyebrow={scope.eyebrow}
        title={scope.title}
        description={scope.description}
        breadcrumb={breadcrumb}
      >
        {/* Category tabs — sibling subcategories derived purely from the
            canonical department/category tree; never hardcoded. */}
        <div className="mt-5 md:mt-6">
          <CategoryTabs scopeFilters={scope.filters} pathname={pathname} />
        </div>
      </CatalogueHeader>

      <AtelierSection rhythm="none" width="wide" className="pb-20 md:pb-28">
        <CatalogueBrowser
          scopeFilters={scope.filters}
          emptyAction={
            <AtelierButton as={Link} to="/shop" variant="outline" size="md">
              Browse everything
            </AtelierButton>
          }
        />
      </AtelierSection>

      {/* Curated marketing rails appear AFTER the product grid so the
          catalogue stays the dominant element. Marketing Media remains
          independent — these rails resolve through the same canonical
          placement register they always did. */}
      {curatedRailPlacements.map((placement) => (
        <PlacementProductRail key={placement.id} placementId={placement.id} />
      ))}
    </>
  );
}
