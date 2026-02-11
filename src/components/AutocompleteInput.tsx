import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const AutocompleteInput: React.FC<Props> = ({ value, onChange, options = [], placeholder, className, autoFocus }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we have a value, filter. If empty, maybe show nothing or generic?
    if (value) {
      const lower = value.toLowerCase();
      const normalizedSearch = lower.replace(/[\s-]/g, '');

      // Case insensitive check with fuzzy space/dash handling
      const matches = (options || []).filter(opt => {
          if (typeof opt !== 'string') return false;
          const normalizedOpt = opt.toLowerCase().replace(/[\s-]/g, '');
          return normalizedOpt.includes(normalizedSearch);
      });

      // Sort matches: startsWith first, then others
      matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        // Exact match priority
        if (aLower === lower) return -1;
        if (bLower === lower) return 1;

        const aStarts = aLower.startsWith(lower);
        const bStarts = bLower.startsWith(lower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return a.localeCompare(b);
      });
      setFilteredOptions(matches.slice(0, 10));
    } else {
      setFilteredOptions([]);
    }
  }, [value, options]);

  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        value={value}
        onChange={e => {
            onChange(e.target.value);
            setShowSuggestions(true);
        }}
        onFocus={() => {
            if (value) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />
      {showSuggestions && filteredOptions.length > 0 && (
        <ul className="absolute z-50 min-w-[200px] w-full bg-zinc-950/95 backdrop-blur-sm border border-zinc-800 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl ring-1 ring-black/50">
          {filteredOptions.map(opt => (
             <li 
                key={opt} 
                className="px-3 py-2 hover:bg-zinc-800 cursor-pointer text-zinc-300 hover:text-white text-sm transition-colors border-b border-zinc-900 last:border-0"
                onClick={() => {
                    onChange(opt);
                    setShowSuggestions(false);
                }}
             >
                {opt}
             </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default AutocompleteInput;
