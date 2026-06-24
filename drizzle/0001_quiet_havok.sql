CREATE TABLE `group_buys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('Draft','Gathering','Funded','Ordered','Testing','Distributing','Complete') NOT NULL DEFAULT 'Draft',
	`moqTarget` decimal(12,2) NOT NULL,
	`participantCap` int,
	`endDate` timestamp,
	`vendorName` varchar(255),
	`vendorCountry` varchar(128),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_buys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupBuyId` int NOT NULL,
	`tierId` int,
	`status` enum('Committed','Payment Pending','Paid','Shipped') NOT NULL DEFAULT 'Committed',
	`totalAmount` decimal(12,2) NOT NULL,
	`trackingNumber` varchar(255),
	`trackingCarrier` varchar(128),
	`shippingName` text,
	`shippingAddress1` text,
	`shippingAddress2` text,
	`shippingCity` varchar(128),
	`shippingState` varchar(64),
	`shippingZip` varchar(20),
	`shippingCountry` varchar(64),
	`adminNotes` text,
	`shippedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participation_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupBuyId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`minAmount` decimal(10,2) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participation_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupBuyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`unit` varchar(64) NOT NULL DEFAULT 'vial',
	`minQuantity` int NOT NULL DEFAULT 1,
	`maxQuantity` int,
	`inStock` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skool_webhook_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookUrl` text NOT NULL,
	`groupSlug` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skool_webhook_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skool_webhook_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupBuyId` int,
	`event` enum('buy_live','moq_reached','test_results_posted','orders_shipped') NOT NULL,
	`payload` text,
	`responseStatus` int,
	`success` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skool_webhook_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupBuyId` int NOT NULL,
	`productId` int,
	`labName` varchar(255) NOT NULL DEFAULT 'Freedom Diagnostics',
	`status` enum('Pending','Samples Sent','In Testing','Results Ready','Published','Failed') NOT NULL DEFAULT 'Pending',
	`coaFileKey` varchar(512),
	`coaFileUrl` text,
	`coaAccessionNumber` varchar(128),
	`purityResult` varchar(64),
	`identityConfirmed` boolean,
	`sampleSentAt` timestamp,
	`resultReceivedAt` timestamp,
	`publishedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','owner') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `skoolUsername` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `shippingName` text;--> statement-breakpoint
ALTER TABLE `users` ADD `shippingAddress1` text;--> statement-breakpoint
ALTER TABLE `users` ADD `shippingAddress2` text;--> statement-breakpoint
ALTER TABLE `users` ADD `shippingCity` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `shippingState` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `shippingZip` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `shippingCountry` varchar(64);