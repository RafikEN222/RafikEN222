CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'to_review' NOT NULL,
	`tailored_cv_path` text,
	`cover_letter` text,
	`notes` text,
	`submitted_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_job_id_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`dedup_key` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`company_slug` text,
	`location` text,
	`contract_type` text,
	`salary_text` text,
	`description` text NOT NULL,
	`url` text NOT NULL,
	`posted_at` text,
	`structured` text,
	`questions` text,
	`fetched_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_dedup_key_idx` ON `jobs` (`dedup_key`);--> statement-breakpoint
CREATE TABLE `matches` (
	`job_id` text PRIMARY KEY NOT NULL,
	`score` integer NOT NULL,
	`details` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`scope` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`jobs_found` integer DEFAULT 0 NOT NULL,
	`jobs_new` integer DEFAULT 0 NOT NULL,
	`details_fetched` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text
);
