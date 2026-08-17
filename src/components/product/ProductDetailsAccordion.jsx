import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "../../utils/cn";

function SpecificationList({ specifications }) {
  const entries = Object.entries(specifications ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return null;

  return (
    <dl className="border-t border-mist/70">
      {entries.map(([term, value]) => (
        <div key={term} className="grid grid-cols-[minmax(7rem,1fr)_2fr] gap-4 border-b border-mist/70 py-3">
          <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">{term}</dt>
          <dd className="font-ui text-xs leading-relaxed text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProductDetailsAccordion({ product }) {
  const [open, setOpen] = useState("description");
  const baseId = useId();

  const sections = [
    {
      id: "description",
      label: "Description",
      content: <p className="font-display text-xl leading-relaxed text-graphite">{product.description}</p>,
    },
    {
      id: "details",
      label: "Details + Specifications",
      content: (
        <div>
          <p className="mb-6 font-ui text-sm leading-7 text-graphite">{product.details}</p>
          <SpecificationList specifications={product.specifications} />
        </div>
      ),
    },
    {
      id: "fabric",
      label: "Fabric + Material",
      content: (
        <dl className="grid gap-6 sm:grid-cols-2">
          {["Fabric", "Material"].map((term) => (
            <div key={term} className="border-l border-accent pl-4">
              <dt className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">{term}</dt>
              <dd className="mt-2 font-display text-xl text-ink">{term === "Fabric" ? product.fabric : product.material}</dd>
            </div>
          ))}
          <div className="border-l border-accent pl-4 sm:col-span-2">
            <dt className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Best suited to</dt>
            <dd className="mt-2 font-display text-xl text-ink">{product.occasion.join(" · ")}</dd>
          </div>
        </dl>
      ),
    },
    {
      id: "care",
      label: "Care",
      content: (
        <ul className="space-y-3">
          {product.careInstructions.map((instruction) => (
            <li key={instruction} className="flex gap-3 font-ui text-sm leading-6 text-graphite">
              <span className="mt-[.65rem] h-px w-4 shrink-0 bg-accent" aria-hidden="true" />
              {instruction}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "delivery",
      label: "Delivery + Returns",
      content: (
        <div className="grid gap-7 sm:grid-cols-2">
          <div>
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-ink">Delivery</h3>
            <p className="mt-3 font-ui text-sm leading-6 text-graphite">{product.deliveryInfo}</p>
          </div>
          <div>
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-ink">Returns</h3>
            <p className="mt-3 font-ui text-sm leading-6 text-graphite">{product.returnInfo}</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="border-t border-ink/70">
      {sections.map((section) => {
        const expanded = open === section.id;
        const buttonId = `${baseId}-${section.id}-button`;
        const panelId = `${baseId}-${section.id}-panel`;
        return (
          <div key={section.id} className="border-b border-mist">
            <h2>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : section.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left font-ui text-[10px] uppercase tracking-[.18em] text-ink hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
              >
                {section.label}
                <ChevronDown size={15} className={cn("shrink-0 transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
              </button>
            </h2>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="max-w-2xl pb-7">{section.content}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
