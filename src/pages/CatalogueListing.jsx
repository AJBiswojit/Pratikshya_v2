import { Link, useLocation, useParams } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  MediaFrame,
  PageHeader,
  eyebrow,
} from "../design-system";
import CatalogueBrowser from "../components/storefront/CatalogueBrowser";
import { categoryRoutes, collectionRoutes, navigationScopes } from "../data/products/taxonomy";
import taxonomyRepository from "../services/taxonomyRepository";
import { getRouteMeta } from "../config/navigationConfig";
import { imageRef } from "../data/pratikshyaImageManifest";
import { resolveCategoryCover, resolveCollectionCover } from "../services/media/mediaResolver";
import { cn } from "../utils/cn";
import NotFound from "./NotFound";

/**
 * Every product listing that is not the shop.
 *
 * The eight `/category/*` routes, the four `/collection/*` routes and the
 * navigation paths inherited from Phase 3 all render here. The route decides
 * the masthead and the locked filters; the browser beneath is identical in
 * all cases.
 *
 * `variant` tells the page which table to resolve its scope from.
 */
export default function CatalogueListing({ variant }) {
  const params = useParams();
  const { pathname } = useLocation();

  /* --- resolve the scope ----------------------------------------- */

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
          image: category.image,
          heroMediaId: category.bannerMediaId,
          filters: { category: category.id },
        };
      }
    }
  } else if (variant === "collection") {
    scope = collectionRoutes[params.slug] ?? null;
    if (!scope) {
      const collection = taxonomyRepository.findCollection(params.slug);
      if (collection?.displayStatus === "ACTIVE") {
        scope = {
          id: collection.id,
          title: collection.name,
          eyebrow: collection.eyebrow || "Collection",
          description: collection.description,
          image: collection.image,
          heroMediaId: collection.heroMediaId,
          filters: { collectionId: collection.id },
        };
      }
    }
  } else {
    /* A Phase 3 navigation path. Its masthead copy already exists in the
       navigation manifest, so only the filters come from the scope table. */
    const nav = navigationScopes[pathname];
    const meta = getRouteMeta(pathname);
    if (nav && meta) {
      scope = {
        title: nav.title ?? meta.label,
        eyebrow: meta.eyebrow,
        description: meta.description,
        image: meta.image,
        filters: nav.filters ?? {},
        breadcrumb: meta.breadcrumb,
      };
    }
  }

  if (variant === "category" && scope) {
    const currentCategory = taxonomyRepository.findCategory(params.slug) || taxonomyRepository.findCategory(scope.id);
    if (currentCategory?.status !== "ACTIVE") scope = null;
  }
  if (variant === "collection" && scope) {
    const currentCollection = taxonomyRepository.findCollection(params.slug) || taxonomyRepository.findCollection(scope.id);
    if (currentCollection?.displayStatus !== "ACTIVE") scope = null;
  }

  /* An unknown or hidden slug is a missing page, not an empty grid. */
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

  /* The editorial plate resolves through the central media resolver, so
     category and collection pages show the same centralized media the rest
     of the storefront uses — managed banner first, then library media, then
     the authored artwork. Navigation paths keep their authored plate. */
  const heroImage = (() => {
    if (variant === "category") {
      const category = taxonomyRepository.findCategory(scope.id);
      if (category) return resolveCategoryCover(category);
    } else if (variant === "collection") {
      const collection = taxonomyRepository.findCollection(scope.id);
      if (collection) return resolveCollectionCover(collection);
    }
    return imageRef(scope.image);
  })();

  return (
    <>
      <PageHeader
        eyebrow={scope.eyebrow}
        title={scope.title}
        description={scope.description}
        breadcrumb={breadcrumb}
        size="section"
      />

      {/* Editorial plate — establishes the edit before the grid begins. */}
      {scope.image ? (
        <AtelierSection rhythm="none" width="wide" className="pb-16 md:pb-24">
          <MediaFrame
            image={heroImage}
            alt={scope.title}
            aspect="panorama"
            surface
            overlay="inkLeft"
          >
            <div className="absolute inset-0 flex items-end p-8 md:p-12">
              <p className={cn(eyebrow.section, "text-ivory/90")}>
                {scope.eyebrow ?? "Pratikshya Fashon"}
              </p>
            </div>
          </MediaFrame>
        </AtelierSection>
      ) : null}

      <AtelierSection rhythm="none" width="wide" className="pb-24 md:pb-36">
        <CatalogueBrowser
          scopeFilters={scope.filters}
          emptyAction={
            <AtelierButton as={Link} to="/shop" variant="outline" size="md">
              Browse Everything
            </AtelierButton>
          }
        />
      </AtelierSection>
    </>
  );
}
