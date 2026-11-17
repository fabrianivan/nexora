import React from 'react';
import { cn } from './cn';

export function Card({ className, children, as: As = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={cn('bg-surface border border-line rounded-lg', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="mt-1 text-ink-3 [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h2 className="font-serif text-[19px] font-medium text-ink leading-6">{title}</h2>
          {description && <p className="text-[13px] text-ink-3 mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 py-3 border-t border-line rounded-b-lg flex items-center gap-2', className)}>{children}</div>;
}

/**
 * An unboxed section: a serif heading over a hairline rule. Use instead of a Card
 * when the content is prose, a list or figures that need no container.
 */
export function Section({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/80 pb-2 mb-4">
        <div className="min-w-0">
          <h2 className="font-serif text-[21px] font-medium text-ink leading-7">{title}</h2>
          {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
