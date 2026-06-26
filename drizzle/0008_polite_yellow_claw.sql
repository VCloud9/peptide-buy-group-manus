CREATE TABLE `vendor_sku_coas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorSkuId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`labName` varchar(255),
	`purityPct` decimal(5,2),
	`testedAt` timestamp,
	`notes` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_sku_coas_id` PRIMARY KEY(`id`)
);
