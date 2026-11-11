CREATE TABLE `task_status_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by_id` integer,
	`changed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `task_status_events_task_id_idx` ON `task_status_events` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_status_events_project_id_idx` ON `task_status_events` (`project_id`);