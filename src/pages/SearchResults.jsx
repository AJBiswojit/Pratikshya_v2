import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  PageHeader,
  eyebrow,
  transition,
} from "../design-system";
import CatalogueBrowser from "../components/storefront/CatalogueBrowser";
import { searchSuggestions } from "../config/navigationConfig";
import { cn } from "../utils/cn";

/**
 * Search results.
 *
 * The term lives in `?q=`, so a search is a shareable URL and the browser's
 * back button walks the history of what was looked for. The field on the page
 * mirrors that term and rewrites it on submit.
 *
 * Matching, filtering and sorting are the same engine every other listing
 * uses; search is simply one more predicate applied before the filters.
 */
export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);

  /* Keep the field honest when the term changes from outside the page —
     the header panel, a suggestion chip or the back button. */
  useEffect(() => setDraft(query), [query]);

  const submit = (value) => {
    const term = value.trim();
    setParams(term ? { q: term } : {});
  };

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={query ? <span className="italic">“{query}”</span> : "Find your piece"}
        description={
          query
            ? "Everything in the house matching your search, filterable like any other edit."
            : "Search the catalogue by name, fabric, occasion, colour or collection."
        }
        breadcrumb={[{ label: "Search" }]}
        size="section"
      />

      <AtelierSection rhythm="none" width="wide" className="pb-16 md:pb-20">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
          className="max-w-xl"
        >
          <label htmlFor="catalogue-search" className={cn(eyebrow.label, "text-taupe block mb-4")}>
            Search the atelier
          </label>

          <div className="flex items-center gap-3 border-b border-ink/20 focus-within:border-accent transition-colors">
            <Search size={16} strokeWidth={1.5} className="text-brass shrink-0" aria-hidden="true" />
            <input
              id="catalogue-search"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search the catalogue…"
              className={cn(
                "w-full bg-transparent py-3 font-display text-2xl md:text-3xl font-light",
                "placeholder:text-ash focus:outline-none"
              )}
            />
            <button
              type="submit"
              className={cn(eyebrow.label, "shrink-0 text-brass hover:text-accent", transition.colors)}
            >
              Search
            </button>
          </div>
        </form>

        {/* Suggestions, offered only when there is nothing to show yet. */}
        {!query ? (
          <div className="mt-10">
            <p className={cn(eyebrow.label, "text-taupe mb-4")}>Suggested</p>
            <div className="flex flex-wrap gap-2">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className={cn(
                    "border border-mist px-4 py-2",
                    eyebrow.label,
                    "text-graphite hover:border-ink hover:text-ink",
                    transition.all
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </AtelierSection>

      <AtelierSection rhythm="none" width="wide" className="pb-24 md:pb-36">
        <CatalogueBrowser
          searchFromUrl
          unit="matches"
          emptyAction={
            <AtelierButton as={Link} to="/shop" variant="outline" size="md">
              Browse Everything
            </AtelierButton>
          }
        />
      </AtelierSection>
    </>
  );
}
