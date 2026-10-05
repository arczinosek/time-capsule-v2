import type { ReactNode } from 'react';

/**
 * A page's <h1> in the chronicle style, with optional lines under it (`children`: date,
 * category, kind) and actions on the right (buttons, links). Every page uses it.
 */
export function PageHeading({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl tracking-wide text-primary md:text-3xl">
          {title}
        </h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
