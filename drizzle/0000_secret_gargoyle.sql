CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text DEFAULT '' NOT NULL,
	`tempo_bpm` real NOT NULL,
	`tuning` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` integer NOT NULL
);
