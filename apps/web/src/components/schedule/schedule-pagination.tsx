"use client";

import { Button } from "@/components/ui";

export interface SchedulePaginationProps {
  /** Accessible name for this pagination control (one per list group). */
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Previous / Next pager for a single list group. Renders nothing when the group
 * fits on one page.
 */
export function SchedulePagination({
  label,
  page,
  totalPages,
  onPageChange,
}: SchedulePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="schedule-pagination" aria-label={label}>
      <Button
        type="button"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="schedule-pagination-status" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
