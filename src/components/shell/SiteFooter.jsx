import { Link } from "react-router-dom";
import {
  Brand,
  Container,
  body,
  eyebrow,
  gap,
  grid,
  heading,
  transition,
} from "../../design-system";
import {
  brand,
  footerNavigation,
  legalNavigation,
} from "../../config/navigationConfig";
import { cn } from "../../utils/cn";

/**
 * The global footer.
 *
 * The Phase 1 footer, unchanged in appearance and now routed: ink ground,
 * the brand mark and its line, three link columns headed in gold micro-
 * labels, and a hairline bottom bar carrying the copyright and the legal
 * links.
 */
export default function SiteFooter({ className = "" }) {
  return (
    <footer className={cn("bg-ink text-ivory px-6 md:px-12 py-16", className)}>
      <Container className={cn(grid.footer, gap.column, "mb-12")}>
        <div>
          <Brand
            as="h4"
            size="default"
            variant="lockup"
            theme="dark"
            wordmark={brand.name}
            className="mb-4"
          />
          <p className={cn(body.caption, "text-ash")}>{brand.tagline}</p>
        </div>

        {footerNavigation.map((column) => (
          <div key={column.title}>
            <h5 className={cn(eyebrow.labelDisplay, "text-gold mb-4")}>{column.title}</h5>
            <ul className={cn("space-y-2", body.caption, "text-ash")}>
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={cn("hover:text-white", transition.colors)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container
        className={cn(
          "pt-8 border-t border-ink-line flex flex-wrap gap-3 justify-between",
          body.micro,
          "text-ash-deep"
        )}
      >
        <span>{brand.copyright}</span>
        <ul className="flex flex-wrap items-center gap-2">
          {legalNavigation.map((item, index) => (
            <li key={item.to} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">·</span>}
              <Link to={item.to} className={cn("hover:text-ash", transition.colors)}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
