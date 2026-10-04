CREATE TABLE `locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(9,6) NOT NULL,
	`longitude` decimal(9,6) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`location_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `places_id` PRIMARY KEY(`id`),
	CONSTRAINT `places_location_id_unique` UNIQUE(`location_id`)
);
--> statement-breakpoint
ALTER TABLE `milestones` ADD `location_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `places` ADD CONSTRAINT `places_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;