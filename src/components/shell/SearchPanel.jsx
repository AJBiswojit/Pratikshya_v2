import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AtelierButton,
  Container,
  body,
  duration,
  eyebrow,
  gap,
  transition,
} from "../../design-system";
import { searchSuggestions } from "../../config/navigationConfig";
import { cn } from "../../utils/cn";

/**
 * The search field that drops out of the header.
 *
 * A single hairline-underlined input in the Atelier manner — no box, no
 * radius, no shadow — with the suggested searches offered as outline chips
 * beneath it.
 *
 * Submitting routes to `/search` with the query attached. The results page
 * itself belongs to a later phase; the shell only has to get you there.
 */
export default function SearchPanel({ onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (value) => {
    const term = value.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: duration.page, ease: "easeOut" }}
      className="absolute left-0 right-0 top-full bg-canvas border-b border-mist/50 shadow-2xl shadow-ink/10"
    >
      <Container width="content" padded className="py-10">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit(query);
          }}
        >
          <label htmlFor="atelier-search" className={cn(eyebrow.label, "text-taupe block mb-4")}>
            Search the atelier
          </label>
          <div className="flex items-center gap-4 border-b border-pearl pb-4">
            <Search size={18} strokeWidth={1.5} className="text-brass shrink-0" aria-hidden="true" />
            <input
              id="atelier-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sarees, lehengas, bangles…"
              className={cn(
                body.lead,
                "w-full bg-transparent text-ink placeholder:text-taupe",
                "border-0 outline-none focus:outline-none"
              )}
            />
            <AtelierButton type="submit" size="chip" className="shrink-0">
              Search
            </AtelierButton>
          </div>
        </form>

        <div className="mt-6">
          <p className={cn(eyebrow.label, "text-taupe mb-3")}>Suggested</p>
          <div className={cn("flex flex-wrap", gap.chip)}>
            {searchSuggestions.map((suggestion) => (
              <AtelierButton
                key={suggestion}
                variant="outline"
                size="chip"
                onClick={() => submit(suggestion)}
                className={transition.colors}
              >
                {suggestion}
              </AtelierButton>
            ))}
          </div>
        </div>
      </Container>
    </motion.div>
  );
}
