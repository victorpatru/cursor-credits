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
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
