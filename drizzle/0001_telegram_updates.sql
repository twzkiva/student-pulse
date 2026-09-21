CREATE TABLE `telegram_updates` (
	`update_id` integer PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
