CREATE TABLE `milestones` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `milestones_date_idx` ON `milestones` (`date`);