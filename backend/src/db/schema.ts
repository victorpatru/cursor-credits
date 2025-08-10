import { pgTable, serial, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const attendees = pgTable(
  "attendees",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    checkedInAt: text("checked_in_at").notNull(),
    assignedCode: text("assigned_code"),
    emailSent: boolean("email_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEmail: index("attendees_by_email").on(t.email),
  })
);

export const sentEmails = pgTable(
  "sent_emails",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    redemptionLink: text("redemption_link").notNull(),
    eventName: text("event_name").notNull(),
    checkedInAt: text("checked_in_at").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bySentAt: index("sent_emails_by_sent_at").on(t.sentAt),
  })
);


