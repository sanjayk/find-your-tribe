'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useQuery } from '@apollo/client/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAG_SUGGESTIONS } from '@/lib/graphql/queries/invitations';
import type { GetTagSuggestionsData } from '@/lib/graphql/types';

export type TagField =
  | 'tech_stack'
  | 'domains'
  | 'ai_tools'
  | 'build_style'
  | 'services';

export interface TagTypeaheadProps {
  field: TagField;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  maxTags?: number;
}

const DEBOUNCE_MS = 300;
const SUGGESTION_LIMIT = 10;
const BLUR_CLOSE_DELAY_MS = 150;

export function TagTypeahead({
  field,
  selectedTags,
  onTagsChange,
  label,
  placeholder = 'Add a tag...',
  maxTags,
}: TagTypeaheadProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounce input changes so we don't flood the API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data } = useQuery<GetTagSuggestionsData>(TAG_SUGGESTIONS, {
    variables: { field, query: debouncedQuery, limit: SUGGESTION_LIMIT },
    skip: !isOpen,
  });

  // Filter out already-selected tags from the suggestions
  const suggestions = (data?.tagSuggestions ?? []).filter(
    (tag) => !selectedTags.includes(tag)
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || selectedTags.includes(trimmed)) return;
      if (maxTags !== undefined && selectedTags.length >= maxTags) return;
      onTagsChange([...selectedTags, trimmed]);
      setInputValue('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [selectedTags, onTagsChange, maxTags]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    },
    [selectedTags, onTagsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          addTag(suggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
        break;
      case 'Backspace':
        if (!inputValue && selectedTags.length > 0) {
          removeTag(selectedTags[selectedTags.length - 1]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Delay closing so dropdown item mousedown/click can fire first
  const handleBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, BLUR_CLOSE_DELAY_MS);
  };

  const isAtMax = maxTags !== undefined && selectedTags.length >= maxTags;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <p className="overline text-ink-tertiary mb-1.5">{label}</p>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={isAtMax ? `Max ${maxTags} tags` : placeholder}
        disabled={isAtMax}
        className={cn(
          'w-full bg-surface-elevated text-[14px] font-sans rounded-lg px-3 py-2 outline-none',
          'placeholder:text-ink-tertiary text-ink',
          'transition-shadow focus:shadow-sm',
          isAtMax && 'opacity-50 cursor-not-allowed'
        )}
        role="combobox"
        aria-label={label ?? 'Tag input'}
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-surface-elevated shadow-md rounded-xl overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              // onMouseDown + e.preventDefault() keeps focus on the input while
              // still allowing the dropdown item to be activated
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] font-mono text-ink-secondary transition-colors',
                index === highlightedIndex && 'bg-surface-secondary text-ink'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Selected tag pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-accent-subtle text-accent font-mono text-[11px] px-2.5 py-0.5 rounded-md"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-accent-hover transition-colors ml-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
