import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accent,
  AtelierButton,
  AtelierSection,
  EditorialHeading,
  body,
  eyebrow,
  gap,
  header as headerSpacing,
  transition,
} from "../design-system";
import { primaryNavigation } from "../config/navigationConfig";
import { cn } from "../utils/cn";

/**
 * The 404.
 *
 * Written in the brand's voice rather than as an error: it names what
 * happened once, then hands the visitor the six primary groups so the page
 * is a way onward instead of a dead end.
 */
export default function NotFound() {
  return (
    <main className={headerSpacing.offset}>
      <AtelierSection rhythm="spacious" width="narrow" className="text-center">
        <EditorialHeading
          as="h1"
          size="manifesto"
          eyebrow="Error 404"
          description="The page you were looking for has been moved, renamed, or never existed. The collections below are all still here."
          descriptionClassName={cn(body.lead, "text-taupe max-w-md mx-auto")}
          spacing={{ eyebrow: "mb-6", title: "mb-6", description: "" }}
        >
          Nothing <Accent>Here</Accent>
        </EditorialHeading>

        <div className={cn("mt-12 flex flex-wrap justify-center", gap.chip)}>
          {primaryNavigation.map((group) => (
            <AtelierButton key={group.id} as={Link} to={group.to} variant="outline" size="chip">
              {group.label}
            </AtelierButton>
          ))}
        </div>

        <div className="mt-12">
          <AtelierButton as={Link} to="/">
            Return to the atelier <ArrowRight size={14} aria-hidden="true" />
          </AtelierButton>
        </div>

        <p className={cn(eyebrow.label, "text-taupe mt-16")}>
          <Link to="/contact" className={cn("hover:text-accent", transition.colors)}>
            Or write to the atelier
          </Link>
        </p>
      </AtelierSection>
    </main>
  );
}
