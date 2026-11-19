"use client";

import type { ScheduleKindFilter } from "./format";

const KIND_OPTIONS: Array<{ value: ScheduleKindFilter; label: string }> = [
  { value: "all", label: "All types" },
  { value: "milestone", label: "Milestones" },
  { value: "deadline", label: "Deadlines" },
];

export interface ScheduleFiltersProps {
  kind: ScheduleKindFilter;
  query: string;
  onKindChange: (kind: ScheduleKindFilter) => void;
  onQueryChange: (query: string) => void;
}

/**
 * Read-only toolbar controls available to every project member. They narrow the
 * calendar chips and the grouped list together; write controls stay separate.
 */
export function ScheduleFilters({
  kind,
  query,
  onKindChange,
  onQueryChange,
}: ScheduleFiltersProps) {
  return (
    <div className="schedule-filters">
      <div className="schedule-filter-kinds" role="group" aria-label="Filter by type">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`schedule-filter-kind${kind === option.value ? " schedule-filter-kind-active" : ""}`}
            aria-pressed={kind === option.value}
            onClick={() => onKindChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        className="schedule-filter-search"
        aria-label="Search schedule items"
        placeholder="Search items…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
  );
}
