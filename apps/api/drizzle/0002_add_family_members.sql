CREATE TABLE `family_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`kind` enum('human','animal') NOT NULL,
	`description` text,
	`birth_date` date,
	`death_date` date,
	`mother_id` bigint unsigned,
	`father_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_family_members` (
	`milestone_id` bigint unsigned NOT NULL,
	`family_member_id` bigint unsigned NOT NULL,
	CONSTRAINT `milestone_family_members_milestone_id_family_member_id_pk` PRIMARY KEY(`milestone_id`,`family_member_id`)
);
--> statement-breakpoint
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_mother_id_family_members_id_fk` FOREIGN KEY (`mother_id`) REFERENCES `family_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_father_id_family_members_id_fk` FOREIGN KEY (`father_id`) REFERENCES `family_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestone_family_members` ADD CONSTRAINT `milestone_family_members_milestone_id_milestones_id_fk` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestone_family_members` ADD CONSTRAINT `milestone_family_members_family_member_id_family_members_id_fk` FOREIGN KEY (`family_member_id`) REFERENCES `family_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `milestone_family_members_family_member_id_idx` ON `milestone_family_members` (`family_member_id`);