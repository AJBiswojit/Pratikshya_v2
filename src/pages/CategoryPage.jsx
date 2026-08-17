import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  Accent,
  EditorialHeading,
  MediaFrame,
  PageHeader,
  body,
  eyebrow,
  gap,
  grid,
  heading,
  transition,
} from "../design-system";
import { getRouteMeta, primaryNavigation } from "../config/navigationConfig";
import { cn } from "../utils/cn";

/**
 * The shell of an interior page.
 *
 * Every routed destination in the information architecture renders through
 * this one component: it reads its own metadata from the route manifest,
 * opens with the standard page header and breadcrumb, and lays out the
 * sibling links of its group.
 *
 * The merchandising that will eventually fill these pages — product grids,
 * filtering, sorting, pagination — belongs to a later phase. What exists
 * here is the frame those sections will be dropped into, so the navigation
 * is complete and every link in the shell resolves.
 */
export default function CategoryPage() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);

  if (!meta) return null;

  const group = primaryNavigation.find((candidate) => candidate.id === meta.group) ?? null;
  const isGroupLanding = group ? group.to === pathname : false;

  return (
    <main>
      <PageHeader
        eyebrow={meta.eyebrow}
        title={meta.label}
        description={meta.description}
        breadcrumb={meta.breadcrumb}
      />

      {/* Group landing: the full set of sub-collections. */}
      {isGroupLanding && group && (
        <AtelierSection rhythm="compact">
          <EditorialHeading
            size="subsection"
            rule
            spacing={{ title: "mb-2", rule: "mb-14" }}
          >
            Explore <Accent>{group.label}</Accent>
          </EditorialHeading>

          <div className={cn(grid.tiles, gap.tile)}>
            {group.columns.map((column) => (
              <div key={column.title}>
                <h3 className={cn(eyebrow.label, "text-taupe mb-5")}>{column.title}</h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className={cn(
                          body.caption,
                          "inline-flex items-center gap-2 text-graphite hover:text-accent",
                          transition.colors
                        )}
                      >
                        {link.label}
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AtelierSection>
      )}

      {/* The group's feature, and a way back into the rest of it. */}
      {group && (
        <AtelierSection
          tone="fade"
          rhythm="compact"
          width="content"
          innerClassName={cn(grid.pair, gap.editorial, "items-center")}
        >
          <MediaFrame
            image={group.feature.image}
            alt={group.feature.caption}
            aspect="portrait"
            elevated
          />
          <div>
            <p className={cn(eyebrow.editorial, "text-accent mb-3")}>{group.feature.eyebrow}</p>
            <h2 className={cn(heading.xl, "mb-4")}>{group.feature.title}</h2>
            <p className={cn(body.serif, "text-graphite mb-8 max-w-md")}>
              {group.feature.caption} This edit is being composed — the pieces will appear here
              as the collection is photographed and catalogued.
            </p>
            <AtelierButton as={Link} to={group.to}>
              All {group.label} <ArrowRight size={14} aria-hidden="true" />
            </AtelierButton>
          </div>
        </AtelierSection>
      )}

      {/* Standalone pages have no group, so they close with a quiet note. */}
      {!group && (
        <AtelierSection rhythm="compact" width="prose" className="text-center">
          <p className={cn(body.story, "text-graphite mb-10")}>
            This page is part of the PRATIKSHYA FASHON shell. Its content arrives with the phase
            that owns it — the navigation, layout and routing around it are in place.
          </p>
          <AtelierButton as={Link} to="/">
            Return to the atelier <ArrowRight size={14} aria-hidden="true" />
          </AtelierButton>
        </AtelierSection>
      )}
    </main>
  );
}
