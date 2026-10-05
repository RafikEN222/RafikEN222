ALTER TABLE `jobs` ADD `city` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `category` text;--> statement-breakpoint
CREATE INDEX `jobs_posted_at_idx` ON `jobs` (`posted_at`);