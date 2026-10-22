import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Shared page header: optional breadcrumbs, title, description, actions.
export default function PageHeader({ title, description, crumbs = [], actions }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.label}>
                {i > 0 && <ChevronRight className="w-3 h-3" aria-hidden="true" />}
                {c.to ? <Link to={c.to} className="hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="font-serif text-2xl md:text-[28px] tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}