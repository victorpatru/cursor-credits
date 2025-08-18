CREATE TABLE "attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"checked_in_at" text NOT NULL,
	"assigned_code" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"redemption_link" text NOT NULL,
	"event_name" text NOT NULL,
	"checked_in_at" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "attendees_by_email" ON "attendees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "sent_emails_by_sent_at" ON "sent_emails" USING btree ("sent_at");