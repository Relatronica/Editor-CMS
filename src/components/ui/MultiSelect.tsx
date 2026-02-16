import { useState, useRef, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';

interface Option {
  id: number;
  label: string;
}

interface MultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
  options: Option[];
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  onCreateNew?: (label: string) => Promise<Option>;
}

export default function MultiSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleziona...',
  searchable = true,
  onCreateNew,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => value.includes(opt.id));
  const filteredOptions = options.filter(
    (opt) =>
      !searchTerm ||
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionId: number) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeOption = (optionId: number) => {
    onChange(value.filter((id) => id !== optionId));
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchTerm.trim()) return;

    try {
      const newOption = await onCreateNew(searchTerm.trim());
      onChange([...value, newOption.id]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error creating new option:', error);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="label">{label}</label>}

      {/* Selected tags */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-lg text-xs font-medium"
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input/Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input cursor-pointer flex items-center justify-between"
      >
        <span className={selectedOptions.length > 0 ? 'text-surface-900 dark:text-surface-100 text-sm' : 'text-surface-400 dark:text-surface-500 text-sm'}>
          {selectedOptions.length > 0
            ? `${selectedOptions.length} selezionati`
            : placeholder}
        </span>
        <span className="text-surface-400 dark:text-surface-500 text-xs">&#9660;</span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-soft-lg dark:shadow-dark-soft max-h-60 overflow-auto animate-slide-down">
          {searchable && (
            <div className="p-2 border-b border-surface-200 dark:border-surface-700">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-surface-400 dark:text-surface-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-600 rounded-lg text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 transition-all"
                  placeholder="Cerca..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-surface-400 dark:text-surface-500 text-center">
                {searchTerm ? (
                  <>
                    Nessun risultato per "{searchTerm}"
                    {onCreateNew && (
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        className="block mt-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mx-auto transition-colors"
                      >
                        Crea "{searchTerm}"
                      </button>
                    )}
                  </>
                ) : (
                  'Nessuna opzione disponibile'
                )}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className="w-full px-4 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-700/50 flex items-center gap-2.5 transition-colors"
                >
                  <span
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                      value.includes(option.id)
                        ? 'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500'
                        : 'border-surface-300 dark:border-surface-600'
                    }`}
                  >
                    {value.includes(option.id) && (
                      <Check size={10} className="text-white" />
                    )}
                  </span>
                  <span className="flex-1 text-sm text-surface-900 dark:text-surface-100">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
