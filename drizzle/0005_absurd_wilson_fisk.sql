CREATE TABLE `membership_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`skoolUsername` varchar(128),
	`message` text,
	`status` enum('pending','approved','rejected','invite_sent') NOT NULL DEFAULT 'pending',
	`inviteCode` varchar(32),
	`ghlContactId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_requests_id` PRIMARY KEY(`id`)
);
