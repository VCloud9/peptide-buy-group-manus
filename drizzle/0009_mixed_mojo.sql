CREATE TABLE `vendor_sku_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorSkuId` int NOT NULL,
	`minQty` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_sku_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `negotiatedDiscountPct` decimal(5,2);