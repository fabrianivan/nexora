'use client';

import React, { useId } from 'react';
import { cn } from './cn';

const control =
  'w-full bg-surface border border-line-strong rounded-lg text-sm text-ink placeholder:text-ink-4 shadow-xs transition focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-muted disabled:text-ink-3';

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger-600">{error}</p> : hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** Field + Input wired with a generated id so the label is accessible. */
export function TextField({
  label,
  hint,
  error,
  className,
  mono,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; mono?: boolean }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <Input id={id} aria-invalid={Boolean(error)} className={mono ? 'font-mono' : undefined} {...rest} />
    </Field>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { leading?: React.ReactNode }>(
  function Input({ className, leading, ...rest }, ref) {
    if (leading) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 [&_svg]:size-4">{leading}</span>
          <input ref={ref} className={cn(control, 'h-9 pl-9 pr-3', className)} {...rest} />
        </div>
      );
    }
    return <input ref={ref} className={cn(control, 'h-9 px-3', className)} {...rest} />;
  },
);

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(control, 'h-9 pl-3 pr-8 appearance-none cursor-pointer', className)} {...rest}>
        {children}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" fill="none" aria-hidden>
        <path d="M5.5 8 10 12.5 14.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Select id={id} {...rest}>
        {children}
      </Select>
    </Field>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'px-3 py-2 min-h-[84px] resize-y', className)} {...rest} />;
}

export function TextareaField({
  label,
  hint,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Textarea id={id} {...rest} />
    </Field>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn('flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line-strong accent-brand-600 cursor-pointer" {...rest} />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 select-none', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed',
          checked ? 'bg-brand-600' : 'bg-line-strong',
        )}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-4')} />
      </button>
      <span className="text-sm text-ink-2">{label}</span>
    </label>
  );
}
