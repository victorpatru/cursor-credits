import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  attendees: defineTable({
    userId: v.id("users"),
    email: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    checked_in_at: v.string(),
    assigned_code: v.optional(v.string()),
    email_sent: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"]),
  
  sent_emails: defineTable({
    userId: v.id("users"),
    email: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    redemption_link: v.string(),
    event_name: v.string(),
    checked_in_at: v.string(),
    sent_at: v.number(), // timestamp when email was sent
  })
    .index("by_user", ["userId"])
    .index("by_sent_at", ["sent_at"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
