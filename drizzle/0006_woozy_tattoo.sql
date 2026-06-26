CREATE TABLE `sku_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorSkuId` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`effectiveAt` timestamp NOT NULL DEFAULT (now()),
	`source` enum('import','manual') NOT NULL,
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sku_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`userId` int NOT NULL,
	`groupBuyId` int NOT NULL,
	`qualityScore` tinyint NOT NULL,
	`commScore` tinyint NOT NULL,
	`speedScore` tinyint NOT NULL,
	`packagingScore` tinyint NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_skus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`skuCode` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`productLine` varchar(128),
	`description` text,
	`unit` varchar(64) NOT NULL DEFAULT 'vial',
	`currentPrice` decimal(10,2) NOT NULL,
	`minQuantity` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_skus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`country` varchar(2) NOT NULL,
	`website` varchar(512),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
