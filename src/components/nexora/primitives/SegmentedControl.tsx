import React, { useRef } from 'react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].id);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
      buttons?.[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].id);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
      buttons?.[prevIndex]?.focus();
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs';

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200/80 gap-1 select-none ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            role="tab"
            type="button"
            tabIndex={isSelected ? 0 : -1}
            aria-selected={isSelected}
            onClick={() => onChange(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`inline-flex items-center gap-1.5 font-semibold rounded-md transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-600 ${sizeClasses} ${
              isSelected
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
