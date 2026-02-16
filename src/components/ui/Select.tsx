import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  avatar?: string | null;
}

interface SelectProps {
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export default function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleziona...',
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Select component received:', {
      label,
      optionsCount: options.length,
      options,
      value,
      selectedOption: options.find((opt) => opt.value === value),
    });
  }, [options, value, label]);

  const selectedOption = options.find((opt) => {
    return String(opt.value) === String(value) || opt.value === value;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number | null) => {
    console.log('Select.handleSelect called with:', {
      optionValue,
      optionType: typeof optionValue,
      optionLabel: options.find(opt => opt.value === optionValue)?.label,
    });
    setIsOpen(false);
    setTimeout(() => {
      onChange(optionValue);
    }, 50);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="input w-full text-left flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <>
              {selectedOption.avatar ? (
                <img
                  src={selectedOption.avatar}
                  alt={selectedOption.label}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-2 ring-surface-200 dark:ring-surface-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    {selectedOption.label.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="truncate text-surface-900 dark:text-surface-100">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-surface-400 dark:text-surface-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-surface-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-soft-lg dark:shadow-dark-soft max-h-60 overflow-auto animate-slide-down">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(null);
            }}
            className={`w-full px-4 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-700/50 flex items-center gap-2 transition-colors ${
              !value ? 'bg-primary-50 dark:bg-primary-900/20' : ''
            }`}
          >
            <span className="text-surface-400 dark:text-surface-500">{placeholder}</span>
          </button>
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-surface-400 dark:text-surface-500">
              Nessun autore disponibile
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  console.log('Select option clicked:', {
                    value: option.value,
                    valueType: typeof option.value,
                    label: option.label,
                  });
                  requestAnimationFrame(() => {
                    handleSelect(option.value);
                  });
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-700/50 flex items-center gap-2 transition-colors ${
                  (String(value) === String(option.value) || value === option.value) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                {option.avatar ? (
                  <img
                    src={option.avatar}
                    alt={option.label}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-2 ring-surface-200 dark:ring-surface-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      {option.label.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="truncate text-surface-900 dark:text-surface-100">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
