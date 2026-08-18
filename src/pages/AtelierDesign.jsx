import { useMemo } from "react";
import { MARKETING_PLACEMENTS } from "../config/mediaTypes";
import { useMarketingMedia } from "../hooks/useMedia";
import { resolveHeroImageIds } from "../services/media/mediaResolver";
import { heroSlides } from "../data/catalog/hero";
import HeroCarousel from "../components/storefront/HeroCarousel";
import SareeEditCarousel from "../components/storefront/SareeEditCarousel";
import BrideGroomEdit from "../components/storefront/BrideGroomEdit";
import PlacementProductRail from "../components/storefront/PlacementProductRail";
import ShopByCategory from "../components/storefront/ShopByCategory";
import NewArrivals from "../components/storefront/NewArrivals";
import SaleBanner from "../components/storefront/SaleBanner";
import CelebrationEdit from "../components/storefront/CelebrationEdit";
import {
  Accent,
  AtelierSection,
  EditorialHeading,
  body,
  eyebrow,
} from "../design-system";

export default function AtelierDesign() {
  /* The carousel reads the complete HOME_HERO placement through the existing
     repository hook. The resolver validates the canonical HERO role and owns
     deterministic slide order; this page never authors an image address. */
  const heroMedia = useMarketingMedia(MARKETING_PLACEMENTS.HOME_HERO);

  /* The hero reserves its five plates first; the editorial, category and sale
     seams below seed their exclusion set from this list so the homepage never
     shows the same photograph in several sections at once. */
  const heroImageIds = useMemo(() => resolveHeroImageIds(heroMedia), [heroMedia]);

  return (
    <main id="top">
      <HeroCarousel slides={heroSlides} heroMedia={heroMedia} />

      <SareeEditCarousel />

      {/* Curated marketing sections. Each rail reads its placement from the
          marketing register and resolves the assigned products through the
          canonical catalogue; a placement with nothing curated stays absent,
          so the homepage never changes unless the Admin Portal curates it.
          Catalogue-backed sections use the shared rail; bespoke seams (Saree Edit,
          Bride & Groom, New Arrivals) read the same register internally. */}
      <PlacementProductRail placementId={MARKETING_PLACEMENTS.LEHENGA_SECTION} />

      <PlacementProductRail placementId={MARKETING_PLACEMENTS.WOMEN_SECTION} />

      <BrideGroomEdit excludeIds={heroImageIds} />

      <CelebrationEdit excludeIds={heroImageIds} />

      <ShopByCategory excludeIds={heroImageIds} />

      <NewArrivals />

      <PlacementProductRail placementId={MARKETING_PLACEMENTS.KIDS_SECTION} />

      <SaleBanner excludeIds={heroImageIds} />

      <AtelierSection rhythm="spacious" width="narrow" className="text-center">
        <EditorialHeading
          size="manifesto"
          description="PRATIKSHYA FASHON"
          descriptionClassName={`${eyebrow.caption} text-taupe`}
          spacing={{ title: "mb-4", description: "mb-12" }}
        >
          Our <Accent>Story</Accent>
        </EditorialHeading>
        <p className={`${body.story} text-graphite max-w-2xl mx-auto`}>PRATIKSHYA FASHON brings together the richness of textile craft and the joy of dressing for life’s most meaningful occasions. From the everyday grace of a cotton saree to bridal splendour, every piece is selected with warmth, intention and respect for tradition.</p>
      </AtelierSection>

    </main>
  );
}
