CREATE TABLE `family_member_media` (
	`family_member_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`position` int unsigned NOT NULL,
	CONSTRAINT `family_member_media_family_member_id_media_id_pk` PRIMARY KEY(`family_member_id`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` enum('image/jpeg','image/png','image/webp','image/gif') NOT NULL,
	`size_bytes` int unsigned NOT NULL,
	`status` enum('pending','ready') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `milestone_media` (
	`milestone_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`position` int unsigned NOT NULL,
	CONSTRAINT `milestone_media_milestone_id_media_id_pk` PRIMARY KEY(`milestone_id`,`media_id`)
);
--> statement-breakpoint
ALTER TABLE `family_member_media` ADD CONSTRAINT `family_member_media_family_member_id_family_members_id_fk` FOREIGN KEY (`family_member_id`) REFERENCES `family_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_member_media` ADD CONSTRAINT `family_member_media_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestone_media` ADD CONSTRAINT `milestone_media_milestone_id_milestones_id_fk` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestone_media` ADD CONSTRAINT `milestone_media_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `family_member_media_media_id_idx` ON `family_member_media` (`media_id`);--> statement-breakpoint
CREATE INDEX `media_status_created_at_idx` ON `media` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `milestone_media_media_id_idx` ON `milestone_media` (`media_id`);