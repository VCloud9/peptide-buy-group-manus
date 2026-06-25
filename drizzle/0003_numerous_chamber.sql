CREATE TABLE `ghl_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`email` varchar(320),
	`userId` int,
	`payload` text,
	`success` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ghl_sync_logs_id` PRIMARY KEY(`id`)
);
