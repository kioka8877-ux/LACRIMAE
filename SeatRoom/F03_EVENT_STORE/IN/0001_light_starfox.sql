CREATE TABLE `agent_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(128) NOT NULL DEFAULT 'event-grand-bal',
	`email` varchar(320) NOT NULL,
	`role` enum('organizer','agent') NOT NULL DEFAULT 'agent',
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_invitations_email_event_unique` UNIQUE(`email`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(128) NOT NULL DEFAULT 'event-grand-bal',
	`uuid` varchar(64) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`phone` varchar(32),
	`table` varchar(64),
	`status` enum('pending','present','flagged') NOT NULL DEFAULT 'pending',
	`checkInTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guests_id` PRIMARY KEY(`id`),
	CONSTRAINT `guests_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
ALTER TABLE `agent_invitations` ADD CONSTRAINT `agent_invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;