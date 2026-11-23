'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'dark';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-subtle disabled:text-ink-4',
  ghost: 'text-ink-2 hover:bg-muted hover:text-ink disabled:text-ink-4',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-60',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 disabled:opacity-60',
  dark: 'bg-ink text-canvas hover:bg-ink-2 disabled:opacity-60',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-md',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none cursor-pointer disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

/** A link that looks like a `Button` — for navigation, where a <button> would be wrong. */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors cursor-pointer text-ink-3 hover:text-ink [&_svg]:size-4',
        size === 'sm' ? 'size-7' : 'size-9',
        variant === 'ghost' ? 'hover:bg-muted' : 'bg-surface border border-line-strong hover:bg-subtle',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/**
 * A text-weight action link — "Kalender", "Buka kasus", "Semua entitas".
 * Carries a 24px minimum hit area (WCAG 2.2 AA 2.5.8): the bare 13px links
 * these replace were 20px tall, which is under the minimum for a standalone
 * target that isn't inline in a sentence.
 */
export function ActionLink({
  href,
  children,
  iconRight,
  tone = 'brand',
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  iconRight?: React.ReactNode;
  tone?: 'brand' | 'quiet';
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 text-[13px] font-medium transition-colors [&_svg]:size-3.5',
        tone === 'brand' ? 'text-brand-700 hover:text-brand-900' : 'text-ink-3 hover:text-ink',
        className,
      )}
    >
      {children}
      {iconRight}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
