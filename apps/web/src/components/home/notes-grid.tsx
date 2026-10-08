import Link from 'next/link';

import type { WikiPage } from '@bolder/shared';

import { FileTextIcon, PlusIcon } from '@/components/shell/icons';

export interface NotesGridProps {
  pages: WikiPage[];
}

function excerpt(content: string): string {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

/**
 * Recent activity / notes card grid.
 *
 * Renders wiki pages from the home summary plus an empty "add" affordance.
 */
export function NotesGrid({ pages }: NotesGridProps) {
  return (
    <section className="notes-section" aria-labelledby="recent-title">
      <h2 id="recent-title" className="widget-title">
        Recent activity
      </h2>
      <div className="notes-grid">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={`/app/projects/${page.projectId}/wiki`}
            className="note-card"
          >
            <div className="note-card-header">
              <span aria-hidden="true">
                <FileTextIcon width={16} height={16} />
              </span>
              <span className="note-card-title">{page.title}</span>
            </div>
            {page.content ? (
              <p className="note-card-excerpt">{excerpt(page.content)}</p>
            ) : null}
          </Link>
        ))}
        <Link href="/app/projects" className="note-card-add" aria-label="Create new page">
          <PlusIcon width={24} height={24} />
        </Link>
      </div>
    </section>
  );
}
