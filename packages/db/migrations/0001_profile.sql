CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`cv` text NOT NULL,
	`preferences` text NOT NULL,
	`answers` text NOT NULL,
	`cv_file_name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
