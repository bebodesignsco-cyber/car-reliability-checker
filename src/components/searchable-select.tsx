"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
  "aria-label"?: string;
};

export function SearchableSelect({
  id,
  name,
  value,
  onValueChange,
  options,
  disabled = false,
  emptyLabel = "—",
  searchPlaceholder = "Search…",
  noMatchesLabel = "No matches",
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.value === value)?.label ?? null;
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const triggerClass =
    "flex h-14 w-full items-center justify-between border-2 border-foreground bg-background px-4 text-left text-base font-medium text-foreground";

  return (
    <div ref={rootRef} className="relative w-full">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setQuery("");
            return;
          }
          setQuery("");
          setOpen(true);
        }}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span className={selectedLabel ? "text-foreground" : "text-foreground/50"}>
          {selectedLabel ?? emptyLabel}
        </span>
        <span className="text-foreground/70" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-[min(22rem,calc(100vh-8rem))] flex-col border-2 border-foreground bg-background shadow-[4px_4px_0_0_var(--foreground)]"
          role="presentation"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b-2 border-foreground p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder={searchPlaceholder}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listId}
              className="h-11 w-full border-2 border-foreground bg-background px-3 text-base text-foreground outline-none placeholder:text-foreground/45 focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="min-h-0 flex-1 overflow-y-auto py-1"
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                id={`${listId}-opt-empty`}
                className="flex w-full px-4 py-2.5 text-left text-base font-medium text-foreground/60 hover:bg-foreground hover:text-background"
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                  setQuery("");
                }}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-foreground/70" role="presentation">
                {noMatchesLabel}
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === o.value}
                    id={`${listId}-opt-${o.value}`}
                    className={`flex w-full px-4 py-2.5 text-left text-base font-medium hover:bg-foreground hover:text-background ${
                      value === o.value ? "bg-foreground text-background" : "text-foreground"
                    }`}
                    onClick={() => {
                      onValueChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
