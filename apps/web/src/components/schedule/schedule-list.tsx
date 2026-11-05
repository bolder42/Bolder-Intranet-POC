"use client";

import { useState } from "react";
import type { ScheduleItem } from "@bolder/shared";
import { Button } from "@/components/ui";

import { DeleteScheduleItem } from "./delete-schedule-item";
import { formatDate, groupScheduleItems, paginate } from "./format";
import { SchedulePagination } from "./schedule-pagination";

const KIND_LABEL: Record<ScheduleItem["kind"], string> = {
  milestone: "Milestone",
  deadline: "Deadline",
};

type SectionId = "overdue" | "upcoming" | "past";

const INITIAL_PAGES: Record<SectionId, number> = { overdue: 1, upcoming: 1, past: 1 };

export interface ScheduleListProps {
  projectId: string;
  items: ScheduleItem[];
  /** `yyyy-mm-dd` UTC key for "today". */
  today: string;
  canWrite?: boolean;
  onEdit?: (item: ScheduleItem) => void;
}

/**
 * Grouped, paginated list view: overdue deadlines, upcoming items and past
 * milestones. Each group shows up to five entries per page; groups that fit on a
 * single page render no pager. Writers get inline edit + delete controls.
 */
export function ScheduleList({
  projectId,
  items,
  today,
  canWrite = false,
  onEdit,
}: ScheduleListProps) {
  const [pages, setPages] = useState<Record<SectionId, number>>(INITIAL_PAGES);

  if (items.length === 0) {
    return <p className="schedule-empty">No milestones or deadlines yet.</p>;
  }

  const groups = groupScheduleItems(items, today);
  const allSections: Array<{
    id: SectionId;
    title: string;
    items: ScheduleItem[];
    overdue: boolean;
  }> = [
    { id: "overdue", title: "Overdue", items: groups.overdue, overdue: true },
    { id: "upcoming", title: "Upcoming", items: groups.upcoming, overdue: false },
    { id: "past", title: "Past", items: groups.past, overdue: false },
  ];
  const sections = allSections.filter((section) => section.items.length > 0);

  return (
    <section className="schedule-list" aria-label="Schedule list">
      {sections.map((section) => {
        const current = paginate(section.items, pages[section.id]);
        return (
          <div key={section.id} className="schedule-list-group">
            <h2
              className={`schedule-list-title${section.overdue ? " schedule-list-title-overdue" : ""}`}
            >
              {section.title}
            </h2>
            <ul className="schedule-items">
              {current.items.map((item) => (
                <li
                  key={item.id}
                  className={`schedule-item${section.overdue ? " schedule-item-overdue" : ""}`}
                >
                  <div className="schedule-item-main">
                    <span className={`schedule-kind schedule-kind-${item.kind}`}>
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className="schedule-item-title">{item.title}</span>
                    <time
                      className="schedule-item-date"
                      dateTime={new Date(item.dueAt).toISOString()}
                    >
                      {formatDate(item.dueAt)}
                    </time>
                  </div>
                  {item.description ? (
                    <p className="schedule-item-description">{item.description}</p>
                  ) : null}
                  {canWrite ? (
                    <div className="schedule-item-actions">
                      <Button type="button" variant="secondary" onClick={() => onEdit?.(item)}>
                        Edit
                      </Button>
                      <DeleteScheduleItem
                        projectId={projectId}
                        itemId={item.id}
                        itemTitle={item.title}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <SchedulePagination
              label={`${section.title} pagination`}
              page={current.page}
              totalPages={current.totalPages}
              onPageChange={(page) => setPages((previous) => ({ ...previous, [section.id]: page }))}
            />
          </div>
        );
      })}
    </section>
  );
}
