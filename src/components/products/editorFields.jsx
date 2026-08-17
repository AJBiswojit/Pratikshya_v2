/**
 * PRATIKSHYA FASHON — Product editor field primitives (Phase 13).
 *
 * The complete merchandising workspace is built from these controls so
 * every section carries identical rhythm, hairlines and focus behaviour.
 * Labels are always rendered (never placeholder-only), state is announced,
 * and no control relies on colour alone.
 */

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "../../utils/cn";

export const inputClass =
  "w-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-50";

export const labelClass = "font-ui text-[10px] uppercase tracking-[.18em] text-ink";
export const hintClass = "mt-1.5 font-ui text-[11px] leading-relaxed text-taupe";
export const errorClass = "mt-1.5 font-ui text-[11px] text-accent";

/** Label + control + hint/error wrapper. */
export function Field({ label, hint, error, required, htmlFor, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={cn(labelClass, "mb-2 flex items-center gap-1")}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-accent">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={hintClass}>{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return <input {...rest} value={value ?? ""} onChange={onChange} className={cn(inputClass, rest.className)} />;
}

export function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      {...rest}
      type="number"
      value={value ?? ""}
      onChange={onChange}
      className={cn(inputClass, rest.className)}
    />
  );
}

export function TextArea({ value, onChange, rows = 4, ...rest }) {
  return (
    <textarea
      {...rest}
      rows={rows}
      value={value ?? ""}
      onChange={onChange}
      className={cn(inputClass, "leading-relaxed", rest.className)}
    />
  );
}

export function Select({ value, onChange, options = [], placeholder, allowCustom = false, id, ...rest }) {
  const [customActive, setCustomActive] = useState(false);
  const isCustom = allowCustom && Boolean(value) && !options.some((option) => option.value === value);
  const showCustomInput = allowCustom && (isCustom || customActive);

  return (
    <div className="space-y-2">
      <select
        id={id}
        {...rest}
        value={isCustom || customActive ? "__custom__" : value ?? ""}
        onChange={(event) => {
          if (event.target.value === "__custom__") {
            setCustomActive(true);
            onChange({ target: { value: "" } });
          } else {
            setCustomActive(false);
            onChange(event);
          }
        }}
        className={cn(inputClass, rest.className)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {allowCustom ? <option value="__custom__">Custom…</option> : null}
      </select>
      {showCustomInput ? (
        <input
          aria-label="Custom value"
          value={value ?? ""}
          onChange={(event) => onChange({ target: { value: event.target.value } })}
          onBlur={() => {
            if (!value) setCustomActive(false);
          }}
          placeholder="Type a custom value"
          className={inputClass}
        />
      ) : null}
    </div>
  );
}

/**
 * Multi-select chip group — buttons with `aria-pressed`, keyboard-friendly,
 * never colour-only (selected chips carry ink fill and a check mark).
 */
export function ChipGroup({
  options,
  value = [],
  onToggle,
  allowCustom = false,
  ariaLabel,
}) {
  const [custom, setCustom] = useState("");
  const selected = new Set(value);

  const toggle = (entry) => {
    onToggle(selected.has(entry) ? value.filter((item) => item !== entry) : [...value, entry]);
  };

  return (
    <div aria-label={ariaLabel}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(option)}
              className={cn(
                "border px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] transition-colors",
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-mist bg-canvas text-taupe hover:border-ink hover:text-ink"
              )}
            >
              {active ? "✓ " : ""}
              {option}
            </button>
          );
        })}
      </div>
      {allowCustom ? (
        <form
          className="mt-3 flex max-w-xs gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const entry = custom.trim();
            if (!entry) return;
            if (!selected.has(entry)) onToggle([...value, entry]);
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Add custom…"
            aria-label="Add a custom value"
            className={inputClass}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 border border-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
          >
            <Plus size={12} aria-hidden="true" /> Add
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Single-select chips (e.g. colour priority). */
export function ChipRadio({ options, value, onChange, allowCustom = false, ariaLabel }) {
  const [custom, setCustom] = useState("");
  const isCustom = value && !options.includes(value);

  return (
    <div aria-label={ariaLabel} role="radiogroup">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option === value ? "" : option)}
              className={cn(
                "border px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] transition-colors",
                active
                  ? "border-ink bg-ink text-ivory"
                  : "border-mist bg-canvas text-taupe hover:border-ink hover:text-ink"
              )}
            >
              {option}
            </button>
          );
        })}
        {isCustom ? (
          <span className="border border-ink bg-ink px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] text-ivory">
            {value}
          </span>
        ) : null}
      </div>
      {allowCustom ? (
        <form
          className="mt-3 flex max-w-xs gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const entry = custom.trim();
            if (entry) onChange(entry);
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Custom colour…"
            aria-label="Custom colour"
            className={inputClass}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 border border-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
          >
            <Plus size={12} aria-hidden="true" /> Set
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Tag input with suggestions — searchable free-text chips. */
export function TagInput({ value = [], onChange, suggestions = [], placeholder = "Add a tag…" }) {
  const [draft, setDraft] = useState("");
  const selected = new Set(value.map((tag) => tag.toLowerCase()));

  const add = (entry) => {
    const clean = entry.trim();
    if (!clean || selected.has(clean.toLowerCase())) return;
    onChange([...value, clean]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-2 border border-mist bg-canvas px-3 py-1.5 font-ui text-[11px] uppercase tracking-[.12em] text-ink"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((entry) => entry !== tag))}
              className="text-taupe transition-colors hover:text-accent"
            >
              <X size={11} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-3 flex max-w-sm gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label="Add a tag"
          className={inputClass}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 border border-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
        >
          <Plus size={12} aria-hidden="true" /> Add
        </button>
      </form>
      {suggestions.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions
            .filter((suggestion) => !selected.has(suggestion.toLowerCase()))
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => add(suggestion)}
                className="border border-mist px-2.5 py-1 font-ui text-[10px] uppercase tracking-[.12em] text-taupe transition-colors hover:border-ink hover:text-ink"
              >
                + {suggestion}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

/** An on/off merchandising row with label and supporting copy. */
export function ToggleRow({ label, hint, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mist/60 py-3 last:border-0">
      <div>
        <label htmlFor={id} className="cursor-pointer font-ui text-sm text-ink">
          {label}
        </label>
        {hint ? <p className="mt-0.5 font-ui text-[11px] text-taupe">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-10 shrink-0 items-center border transition-colors",
          checked ? "border-ink bg-ink" : "border-mist bg-canvas"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-3.5 w-3.5 transition-all",
            checked ? "left-[22px] bg-ivory" : "left-[3px] bg-taupe"
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

/** Bullet list editor — highlights, care instructions. */
export function ListEditor({ value = [], onChange, placeholder = "Add a line…", ariaLabel }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const entry = draft.trim();
    if (!entry) return;
    onChange([...value, entry]);
    setDraft("");
  };

  return (
    <div aria-label={ariaLabel}>
      {value.length ? (
        <ul className="space-y-2">
          {value.map((entry, index) => (
            <li key={`${entry}-${index}`} className="flex items-start justify-between gap-3 border border-mist/70 bg-canvas px-3 py-2">
              <span className="font-ui text-sm text-ink">{entry}</span>
              <button
                type="button"
                aria-label={`Remove “${entry}”`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="mt-0.5 text-taupe transition-colors hover:text-accent"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-ui text-[11px] text-taupe">Nothing added yet.</p>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={inputClass}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 border border-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
        >
          <Plus size={12} aria-hidden="true" /> Add
        </button>
      </form>
    </div>
  );
}

/** Key/value editor — structured specifications. */
export function KeyValueEditor({ value = {}, onChange, keyPlaceholder = "Field", valuePlaceholder = "Value" }) {
  const entries = Object.entries(value);
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");

  const add = () => {
    const key = draftKey.trim();
    const val = draftValue.trim();
    if (!key || !val) return;
    onChange({ ...value, [key]: val });
    setDraftKey("");
    setDraftValue("");
  };

  return (
    <div>
      {entries.length ? (
        <dl className="divide-y divide-mist/60 border border-mist/70 bg-canvas">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{key}</dt>
                <dd className="font-ui text-sm text-ink">{val}</dd>
              </div>
              <button
                type="button"
                aria-label={`Remove specification ${key}`}
                onClick={() => {
                  const next = { ...value };
                  delete next[key];
                  onChange(next);
                }}
                className="text-taupe transition-colors hover:text-accent"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
        </dl>
      ) : (
        <p className="font-ui text-[11px] text-taupe">No specifications yet.</p>
      )}
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
          placeholder={keyPlaceholder}
          aria-label="Specification name"
          className={inputClass}
        />
        <input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={valuePlaceholder}
          aria-label="Specification value"
          className={inputClass}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 border border-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory"
        >
          <Plus size={12} aria-hidden="true" /> Add
        </button>
      </form>
    </div>
  );
}
