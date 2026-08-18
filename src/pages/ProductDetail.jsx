import { motion } from "framer-motion";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { recordRecentlyViewed } from "../services/customer/recentlyViewed";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EmptyState,
  EditorialHeading,
  MediaFrame,
  PageHeader,
  useReveal,
} from "../design-system";
import ProductDetailsAccordion from "../components/product/ProductDetailsAccordion";
import ProductGallery from "../components/product/ProductGallery";
import ProductPurchasePanel from "../components/product/ProductPurchasePanel";
import ProductRecommendations from "../components/product/ProductRecommendations";
import { getProductByIdentifier, toStorefrontProduct } from "../data/products";
import { getProductRecommendations } from "../data/products/recommendations";
import { imageRef } from "../data/mediaPlaceholder";
import catalogRepository from "../services/catalogRepository";
import taxonomyRepository from "../services/taxonomyRepository";

/**
 * Admin/employee preview: `?preview=1` renders any workspace record —
 * draft, pending or archived — through this same customer design. No
 * second product-detail page exists.
 */
const resolvePreviewProduct = (identifier) => {
  const record =
    catalogRepository.find(identifier) ?? catalogRepository.findBySlug(identifier);
  if (!record) return null;
  return toStorefrontProduct(record, 0);
};

function ProductNotFound() {
  return (
    <>
      <PageHeader
        eyebrow="The Collection"
        title="This piece is no longer in the collection."
        breadcrumb={[{ label: "Shop", to: "/shop" }, { label: "Piece Unavailable" }]}
        size="subsection"
      />
      <AtelierSection rhythm="none" width="wide" className="pb-24 md:pb-36">
        <div className="grid overflow-hidden bg-surface md:grid-cols-2">
          <MediaFrame
            image={imageRef("saree-banarasi")}
            alt="PRATIKSHYA FASHON heritage textile detail"
            aspect="portrait"
            overlay="imageBottom"
            className="min-h-72 md:min-h-[32rem]"
          />
          <EmptyState
            eyebrow="A Changing Atelier"
            title="Another heirloom is waiting."
            description="Our edits are made in considered numbers. Return to the house collection, or begin with the sarees currently on the rail."
            className="px-7"
            actions={
              <>
                <AtelierButton as={Link} to="/shop" variant="primary" size="md">Return to Shop</AtelierButton>
                <AtelierButton as={Link} to="/category/sarees" variant="outline" size="md">Explore Sarees</AtelierButton>
              </>
            }
          />
        </div>
      </AtelierSection>
    </>
  );
}

export default function ProductDetail() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const product = useMemo(
    () => getProductByIdentifier(productId) ?? (isPreview ? resolvePreviewProduct(productId) : null),
    [productId, isPreview]
  );
  const reveal = useReveal();
  const recommendations = useMemo(
    () => (product ? getProductRecommendations(product) : null),
    [product]
  );

  /* A record that is not yet published is an atelier preview — visible by
     direct product id, honestly labelled, never offered for purchase. */
  const isAtelierPreview =
    isPreview || product?.status === "DRAFT" || product?.published === false;

  const { user } = useAuth();

  useEffect(() => {
    if (!product) return undefined;
    const previousTitle = document.title;
    document.title = `${product.name} — PRATIKSHYA FASHON`;
    return () => {
      document.title = previousTitle;
    };
  }, [product]);

  useEffect(() => {
    if (!product || isAtelierPreview) return undefined;
    recordRecentlyViewed(product.id, user?.id ?? null);
    return undefined;
  }, [product, isAtelierPreview, user?.id]);

  if (!product) return <ProductNotFound />;

  const category = taxonomyRepository.findCategory(product.category);
  const categoryPath = `/category/${category?.slug || product.category}`;
  const subcategoryPath = `${categoryPath}?subcategory=${encodeURIComponent(product.subcategory)}`;
  const breadcrumbs = [
    { label: "Shop", to: "/shop" },
    { label: category?.name || product.categoryLabel, to: categoryPath },
    { label: product.subcategory, to: subcategoryPath },
    { label: product.name },
  ];

  /* The story line is assembled from whatever the record actually carries —
     never from invented cloth or collection names. */
  const storyLine = (() => {
    const home = product.collection || (category ? `the ${category.name} atelier` : "the atelier");
    const cloth = [product.fabric, product.material].filter(Boolean);
    const parts = [`From ${home}`];
    if (cloth.length) parts.push(`a study in ${cloth.join(" and ").toLowerCase()}`);
    return `${parts.join(", ")}.`;
  })();

  return (
    <main className="pb-20 md:pb-0">
      {isAtelierPreview ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 bg-ink px-4 py-2 text-center font-ui text-[10px] uppercase tracking-[.22em] text-ivory"
        >
          Atelier preview — this piece is not yet visible to customers
        </div>
      ) : null}
      <AtelierSection rhythm="none" width="wide" className="pb-16 pt-28 sm:pt-32 md:pb-24">
        <Breadcrumb items={breadcrumbs} separator="/" className="mb-8 md:mb-10" />

        <div className="grid gap-11 md:grid-cols-2 md:gap-7 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery product={product} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <ProductPurchasePanel product={product} />
          </div>
        </div>
      </AtelierSection>

      <AtelierSection id="product-details" tone="fade" rhythm="default" width="wide">
        <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-16">
          <motion.div {...reveal} className="md:col-span-4">
            <EditorialHeading
              as="h2"
              size="subsection"
              eyebrow="About the Piece"
              description={storyLine}
              descriptionClassName="max-w-sm font-display text-xl leading-relaxed text-graphite"
              rule
              spacing={{ eyebrow: "mb-4", title: "mb-5", rule: "mb-6" }}
            >
              The story is in the <span className="italic text-accent">making.</span>
            </EditorialHeading>
            <div className="mt-10 border-l border-gold pl-5">
              <p className="font-display text-2xl text-ink">{product.rating.toFixed(1)}</p>
              <p className="mt-1 font-ui text-[9px] uppercase tracking-[.17em] text-taupe">
                From {product.reviewCount.toLocaleString("en-IN")} considered reviews
              </p>
            </div>
          </motion.div>

          <motion.div {...reveal} className="md:col-span-7 md:col-start-6">
            <ProductDetailsAccordion product={product} />
          </motion.div>
        </div>
      </AtelierSection>

      <ProductRecommendations
        id="related-products"
        eyebrow="In the Same Story"
        title={<>Related <span className="italic text-accent">pieces</span></>}
        description="Selected through shared cloth, craft, collection and occasion — never at random."
        products={recommendations.related}
      />

      <ProductRecommendations
        id="complete-the-look"
        eyebrow="The Styling Edit"
        title={<>Complete the <span className="italic text-accent">look</span></>}
        description="A composed edit of finishing pieces chosen to sit naturally beside this silhouette."
        products={recommendations.completeTheLook}
        tone="fade"
      />

      <ProductRecommendations
        id="recommended-products"
        eyebrow="More to Discover"
        title={<>You may also <span className="italic text-accent">like</span></>}
        description="Similar in occasion, palette and price — with no repetition from the edits above."
        products={recommendations.recommended}
      />
    </main>
  );
}
