import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const AutocompleteInput: React.FC<Props> = ({ value, onChange, options, placeholder, className, autoFocus }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we have a value, filter. If empty, maybe show nothing or generic?
    if (value) {
      const lower = value.toLowerCase();
      // Case insensitive check
      const matches = options.filter(opt => opt.toLowerCase().includes(lower));
      // Sort matches: startsWith first, then others
      matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
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
        <ul className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded mt-1 max-h-48 overflow-y-auto shadow-xl">
          {filteredOptions.map(opt => (
             <li 
                key={opt} 
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-gray-200 text-sm"
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
