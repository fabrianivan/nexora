import React from 'react';
import { cn } from './cn';

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-subtle border-y border-line">{children}</thead>;
}

export function TH({ className, children, align = 'left' }: { className?: string; children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-9 px-4 first:pl-5 last:pr-5 text-xs font-medium text-ink-3 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({
  className,
  children,
  onClick,
  selected,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line last:border-0 transition-colors',
        onClick && 'cursor-pointer hover:bg-subtle',
        selected && 'bg-brand-50/50',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  align = 'left',
  colSpan,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 first:pl-5 last:pr-5 py-3 align-middle text-ink-2',
        align === 'right' && 'text-right num whitespace-nowrap',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}
