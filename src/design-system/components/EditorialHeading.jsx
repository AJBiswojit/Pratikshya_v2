import { Fragment } from "react";
import { cn } from "../../utils/cn";
import { display, eyebrow as eyebrowType } from "../typography";
import Rule from "./Rule";

/**
 * The Atelier section headline block: eyebrow, headline, rule, standfirst.
 *
 * Only the slots you pass are rendered, so the same component covers the
 * bare headline above a product grid and the full four-part editorial
 * opening. Vertical spacing between slots is explicit — pass `spacing` to
 * match the rhythm of the section you are writing.
 */

const defaultSpacing = {
  eyebrow: "mb-4",
  title: "mb-4",
  rule: "mb-16",
  description: "",
};

export default function EditorialHeading({
  as: Tag = "h2",
  size = "section",
  eyebrow,
  eyebrowVariant = "section",
  eyebrowTone = "text-accent",
  description,
  descriptionClassName = "font-ui text-sm text-taupe",
  rule = false,
  ruleWidth = "w-16",
  ruleTone = "accent",
  rulePlacement = "afterTitle",
  spacing,
  className = "",
  titleClassName = "",
  children,
  ...rest
}) {
  const gaps = { ...defaultSpacing, ...spacing };

  const ruleNode = rule ? (
    <Rule width={ruleWidth} tone={ruleTone} className={gaps.rule} />
  ) : null;

  /**
   * With no wrapper styling to apply, the slots are emitted directly into the
   * parent. Introducing an unstyled div would make the block a single flex or
   * grid item wherever the parent is one, so the plain case must stay flat.
   */
  const Wrapper = className || Object.keys(rest).length > 0 ? "div" : Fragment;
  const wrapperProps = Wrapper === "div" ? { className, ...rest } : {};

  return (
    <Wrapper {...wrapperProps}>
      {eyebrow ? (
        <p className={cn(eyebrowType[eyebrowVariant], eyebrowTone, gaps.eyebrow)}>
          {eyebrow}
        </p>
      ) : null}

      <Tag className={cn(display[size], gaps.title, titleClassName)}>{children}</Tag>

      {rulePlacement === "afterTitle" ? ruleNode : null}

      {description ? (
        <p className={cn(descriptionClassName, gaps.description)}>{description}</p>
      ) : null}

      {rulePlacement === "afterDescription" ? ruleNode : null}
    </Wrapper>
  );
}
