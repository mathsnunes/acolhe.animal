'use client';

import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { Field } from './field';

export interface CitySuggestion {
  id: string;
  name: string;
  stateCode: string;
}

/**
 * City autocomplete backed by `GET /api/cities`. Debounced (300 ms), keyboard
 * navigable, and selection-required: editing the text after a pick clears the
 * selection, so the form only ever submits a city the user actually chose. The
 * copy (placeholder/empty) is passed in so the component stays namespace-agnostic
 * (reused by signup and the adoption-term form).
 */
export const CityCombobox = ({
  onChange,
  label,
  hint,
  error,
  placeholder,
  emptyLabel,
  id = 'city',
  initialText = '',
}: {
  onChange: (city: CitySuggestion | null) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  placeholder?: string;
  emptyLabel: string;
  id?: string;
  initialText?: string;
}) => {
  const [text, setText] = useState(initialText);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // A pre-filled value (editing) counts as "already selected", so the mount effect
  // doesn't auto-search it and pop an empty dropdown. Typing clears this.
  const selectedRef = useRef(initialText.trim().length > 0);

  useEffect(() => {
    if (selectedRef.current) return; // a pick set the text; don't re-query
    const q = text.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data: { cities: CitySuggestion[] } = await res.json();
        setSuggestions(data.cities);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline — leave the list as-is */
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [text]);

  const select = (city: CitySuggestion) => {
    selectedRef.current = true;
    setText(`${city.name}, ${city.stateCode}`);
    setOpen(false);
    onChange(city);
  };

  const onInput = (next: string) => {
    selectedRef.current = false;
    setText(next);
    onChange(null); // require a fresh selection
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      select(suggestions[active]!);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open ? (
          <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-60 overflow-y-auto rounded-xl border border-line bg-paper p-1 shadow-card">
            {suggestions.length === 0 ? (
              <li className="px-3 py-3 text-center text-[13px] text-ink-mute">{emptyLabel}</li>
            ) : (
              suggestions.map((city, i) => (
                <li key={city.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(city);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full items-baseline justify-between rounded-md px-3 py-2.5 text-left text-sm text-ink transition-colors',
                      i === active ? 'bg-terra-bg' : 'hover:bg-terra-bg',
                    )}
                  >
                    <span>{city.name}</span>
                    <span className="text-[11px] font-medium tracking-wide text-ink-mute">{city.stateCode}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
};
