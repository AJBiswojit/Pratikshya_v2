import { cn } from "../../utils/cn";
import { container as containerWidths, pagePadding } from "../spacing";

/**
 * Centred content column.
 *
 * Used wherever content needs the Atelier measure without a full section
 * wrapper — the fixed header being the primary example.
 */
export default function Container({
  as: Tag = "div",
  width = "wide",
  padded = false,
  className = "",
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(containerWidths[width], padded && pagePadding, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
