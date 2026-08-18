/**
 * PRATIKSHYA FASHON — Compact catalogue header.
 *
 * A product-first replacement for the oversized editorial PageHeader that
 * previously dominated category and subcategory storefront pages.
 *
 * Structure:
 *   Breadcrumb → eyebrow → prominent but compact title → 1–2 line description
 *
 * The header clears the fixed navbar but uses deliberately restrained
 * vertical padding so the catalogue grid reaches the first viewport.
 */

import { cn } from "../../utils/cn";
import { body, display, eyebrow as eyebrowType } from "../../design-system/typography";
import { pagePadding, container as containerWidths } from "../../design-system/spacing";
import Breadcrumb from "../../design-system/components/Breadcrumb";

export default function CatalogueHeader({
  eyebrow,
  title,
  description,
  breadcrumb = [],
  width = "wide",
  className = "",
  children,
}) {
  return (
    <header
      className={cn(
        // Clears the fixed navbar but stays compact.
        "pt-24 md:pt-28 pb-6 md:pb-8",
        pagePadding,
        className
      )}
    >
      <div className={cn(containerWidths[width])}>
        {breadcrumb.length > 0 ? (
          <Breadcrumb items={breadcrumb} className="mb-4 md:mb-5" />
        ) : null}

        {eyebrow ? (
          <p className={cn(eyebrowType.section, "text-accent mb-2 md:mb-3")}>
            {eyebrow}
          </p>
        ) : null}

        <h1
          className={cn(
            display.subsection,
            "text-ink mb-2 md:mb-3",
            // Restrain the maximum size on very wide screens so the title
            // never dwarfs the product grid below it.
            "lg:!text-5xl xl:!text-6xl"
          )}
        >
          {title}
        </h1>

        {description ? (
          <p className={cn(body.base, "text-taupe max-w-xl")}>
            {description}
          </p>
        ) : null}

        {children}
      </div>
    </header>
  );
}
