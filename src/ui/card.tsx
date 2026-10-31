import React from 'react';
import { cn } from './cn';

export function Card({ className, children, as: As = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={cn('bg-surface border border-line rounded-xl shadow-xs', className)} {...rest}>
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
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="mt-0.5 text-ink-3 [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink leading-6">{title}</h2>
          {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
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
  return <div className={cn('px-5 py-3 border-t border-line bg-subtle/60 rounded-b-xl flex items-center gap-2', className)}>{children}</div>;
}
