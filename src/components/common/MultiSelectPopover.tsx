import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon, ChevronDown, Check, Search } from 'lucide-react';

interface MultiSelectPopoverProps {
  label: string;
  icon: LucideIcon;
  options: { id: string; label: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectPopover({
  label,
  icon: Icon,
  options,
  selectedValues,
  onChange,
  placeholder = 'Hledat...'
}: MultiSelectPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const hasSelections = selectedValues.length > 0;

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-sm rounded-lg border shadow-sm flex items-center gap-2 transition-colors ${
          hasSelections
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className={`w-4 h-4 ${hasSelections ? 'text-indigo-600' : 'text-gray-400'}`} />
        <span>
          {label} {hasSelections ? `(${selectedValues.length})` : ''}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            {hasSelections && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Vymazat
              </button>
            )}
          </div>

          {options.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {filteredOptions.map((opt) => {
              const isSelected = selectedValues.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-xs text-gray-700 select-none"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{opt.label}</span>
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="text-xs text-gray-400 py-2 text-center">Žádné položky</p>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Vybrat vše
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-600 font-semibold"
            >
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
