import { useEffect, useMemo, useState } from "react";
import AccountShell from "../../components/account/AccountShell";
import { useAuth } from "../../context/AuthContext";
import { AtelierButton, EditorialHeading } from "../../design-system";
import { catalogueValues } from "../../data/products";
import taxonomyRepository from "../../services/taxonomyRepository";
import {
  getStylePreferences,
  saveStylePreferences,
} from "../../services/customer/stylePreferences";
import { cn } from "../../utils/cn";

function ChipGroup({ label, options, selected, onToggle }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.id)}
              className={cn(
                "border px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] transition-colors",
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-pearl bg-canvas text-ink hover:border-ink"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function AccountPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(() => getStylePreferences(user?.id));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(getStylePreferences(user?.id));
  }, [user?.id]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Style Preferences — PRATIKSHYA FASHON";
    return () => {
      document.title = prev;
    };
  }, []);

  const categories = useMemo(
    () => taxonomyRepository.activeCategories().map((entry) => ({ id: entry.id, label: entry.name })),
    []
  );
  const fabrics = useMemo(
    () => catalogueValues.fabric.map((value) => ({ id: value, label: value })),
    []
  );
  const occasions = useMemo(
    () => catalogueValues.occasion.map((value) => ({ id: value, label: value })),
    []
  );
  const colours = useMemo(
    () => catalogueValues.color.map((value) => ({ id: value, label: value })),
    []
  );

  const toggle = (key, id) => {
    setPrefs((current) => {
      const list = current[key] || [];
      return {
        ...current,
        [key]: list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id],
      };
    });
    setSaved(false);
  };

  const handleSave = (event) => {
    event.preventDefault();
    saveStylePreferences(user?.id, prefs);
    setSaved(true);
  };

  return (
    <AccountShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Style Preferences" },
      ]}
    >
      <div className="max-w-3xl">
        <EditorialHeading
          as="h2"
          size="subsection"
          eyebrow="Your style"
          description="Optional notes the atelier can use to shape what you see next. Nothing here is guessed."
          spacing={{ eyebrow: "mb-3", title: "mb-3", description: "mb-0" }}
        >
          Style <span className="italic text-accent">preferences.</span>
        </EditorialHeading>

        <form onSubmit={handleSave} className="mt-10 space-y-10 border border-mist/80 bg-surface/40 p-7 sm:p-10">
          <ChipGroup
            label="Preferred categories"
            options={categories}
            selected={prefs.categories}
            onToggle={(id) => toggle("categories", id)}
          />
          <ChipGroup
            label="Preferred fabrics"
            options={fabrics}
            selected={prefs.fabrics}
            onToggle={(id) => toggle("fabrics", id)}
          />
          <ChipGroup
            label="Preferred occasions"
            options={occasions}
            selected={prefs.occasions}
            onToggle={(id) => toggle("occasions", id)}
          />
          <ChipGroup
            label="Preferred colours"
            options={colours}
            selected={prefs.colours}
            onToggle={(id) => toggle("colours", id)}
          />

          <div className="flex flex-wrap items-center gap-4 border-t border-mist/70 pt-6">
            <AtelierButton type="submit" variant="primary" size="md">
              Save Preferences
            </AtelierButton>
            {saved ? (
              <p role="status" className="font-ui text-xs text-cocoa">
                Your style notes have been saved.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </AccountShell>
  );
}
