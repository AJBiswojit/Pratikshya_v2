import { cn } from "../../utils/cn";
import { body } from "../typography";
import { pagePadding, container as containerWidths } from "../spacing";
import { tones } from "../tokens";
import Breadcrumb from "./Breadcrumb";
import EditorialHeading from "./EditorialHeading";

/**
 * The masthead of an interior page.
 *
 * Every routed page that is not the landing page opens the same way: it
 * clears the fixed header, states where you are, names the page in the
 * Atelier display scale and, optionally, describes it in a line.
 *
 * This is the layout foundation only — the sections beneath it belong to
 * whichever page owns them.
 */
export default function PageHeader({
  eyebrow: eyebrowText,
  title,
  description,
  breadcrumb = [],
  tone = "canvas",
  size = "subsection",
  width = "wide",
  align = "left",
  actions = null,
  className = "",
  children,
  ...rest
}) {
  const centred = align === "center";

  return (
    <header
      className={cn(
        // Clears the fixed header (h-16 md:h-20) and adds the opening breath.
        "pt-28 md:pt-32 pb-12 md:pb-16",
        pagePadding,
        tones[tone],
        className
      )}
      {...rest}
    >
      <div className={cn(containerWidths[width], centred && "text-center")}>
        {breadcrumb.length > 0 && (
          <Breadcrumb
            items={breadcrumb}
            className={cn("mb-8", centred && "flex justify-center")}
          />
        )}

        <EditorialHeading
          as="h1"
          size={size}
          eyebrow={eyebrowText}
          eyebrowTone={tone === "ink" ? "text-gold" : "text-accent"}
          description={description}
          descriptionClassName={cn(
            body.base,
            tone === "ink" ? "text-ash" : "text-taupe",
            "max-w-xl",
            centred && "mx-auto"
          )}
          spacing={{ eyebrow: "mb-4", title: "mb-4", description: "" }}
        >
          {title}
        </EditorialHeading>

        {actions && <div className={cn("mt-8 flex flex-wrap gap-3", centred && "justify-center")}>{actions}</div>}
        {children}
      </div>
    </header>
  );
}
