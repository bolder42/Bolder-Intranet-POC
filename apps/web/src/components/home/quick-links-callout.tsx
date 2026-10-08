import Link from 'next/link';

import { ChevronRightIcon, MoreHorizontalIcon, StarIcon } from '@/components/shell/icons';

export function QuickLinksCallout() {
  return (
    <section className="quick-links" aria-labelledby="quick-links-title">
      <div className="quick-links-header">
        <ChevronRightIcon />
        <StarIcon width={14} height={14} />
        <span id="quick-links-title">Quick links</span>
        <span className="quick-links-actions">
          {/* Placeholder — opens a quick-links options menu when implemented. */}
          <button
            type="button"
            className="icon-button"
            aria-label="Quick links options (placeholder)"
            disabled
          >
            <MoreHorizontalIcon />
          </button>
        </span>
      </div>
      <ul className="quick-links-list">
        <li>
          <Link href="/app/projects">
            <span aria-hidden="true">→</span> View your projects
          </Link>
        </li>
        <li>
          <Link href="/app/projects">
            <span aria-hidden="true">→</span> Open recent tasks
          </Link>
        </li>
      </ul>
    </section>
  );
}
