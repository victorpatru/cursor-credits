import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export const uploadCSV = mutation({
  args: {
    csvData: v.array(v.object({
      email: v.string(),
      first_name: v.string(),
      last_name: v.string(),
      checked_in_at: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Clear existing data for this user only
    const existing = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const attendee of existing) {
      await ctx.db.delete(attendee._id);
    }
    
    // Insert new data associated with the current user
    for (const row of args.csvData) {
      await ctx.db.insert("attendees", {
        userId,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        checked_in_at: row.checked_in_at,
        email_sent: false,
      });
    }
    
    return { count: args.csvData.length };
  },
});

export const getCheckedInAttendees = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("checked_in_at"), ""))
      .collect();
    
    return attendees;
  },
});

export const assignCodes = mutation({
  args: {
    codes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    const checkedInAttendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("checked_in_at"), ""))
      .collect();
    
    // Assign codes to attendees
    for (let i = 0; i < Math.min(checkedInAttendees.length, args.codes.length); i++) {
      await ctx.db.patch(checkedInAttendees[i]._id, {
        assigned_code: args.codes[i],
      });
    }
    
    return { assigned: Math.min(checkedInAttendees.length, args.codes.length) };
  },
});

export const getAssignmentPreview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("checked_in_at"), ""))
      .collect();
    
    return attendees.map(attendee => ({
      _id: attendee._id,
      first_name: attendee.first_name,
      email: attendee.email,
      assigned_code: attendee.assigned_code || "No code assigned",
    }));
  },
});

export const sendEmails = action({
  args: {
    eventName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const attendees = await ctx.runQuery(api.attendees.getAttendeesWithCodes);
    
    // Validate all attendees have required data
    const attendeesWithoutEmail = attendees.filter(a => !a.email || a.email.trim() === "");
    const attendeesWithoutCode = attendees.filter(a => !a.assigned_code);
    
    if (attendeesWithoutEmail.length > 0) {
      throw new Error(`${attendeesWithoutEmail.length} attendee(s) are missing email addresses`);
    }
    
    if (attendeesWithoutCode.length > 0) {
      throw new Error(`${attendeesWithoutCode.length} attendee(s) don't have assigned codes`);
    }
    
    if (attendees.length === 0) {
      throw new Error("No attendees found to send emails to");
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const attendee of attendees) {
      try {
        // Additional validation per attendee
        if (!attendee.email || attendee.email.trim() === "") {
          console.error(`Skipping attendee ${attendee._id}: missing email`);
          errorCount++;
          continue;
        }
        
        if (!attendee.assigned_code) {
          console.error(`Skipping attendee ${attendee._id}: missing assigned code`);
          errorCount++;
          continue;
        }

        // Send email using Resend with our custom template
        const result = await ctx.runAction(api.emails.sendHackathonCodeEmail, {
          to: attendee.email,
          firstName: attendee.first_name || "Participant",
          redemptionLink: attendee.assigned_code,
          eventName: args.eventName || "Send AI Hackathon"
        });

        if (result.success) {
          // Mark as sent
          await ctx.runMutation(api.attendees.markEmailSent, {
            attendeeId: attendee._id,
          });
          
          // Record in permanent sent_emails history
          await ctx.runMutation(api.attendees.recordSentEmail, {
            email: attendee.email,
            firstName: attendee.first_name || "Participant",
            lastName: attendee.last_name || "",
            redemptionLink: attendee.assigned_code,
            eventName: args.eventName || "Cursor Bucharest Hackathon",
            checkedInAt: attendee.checked_in_at,
          });
          
          successCount++;
        } else {
          console.error(`Failed to send email to ${attendee.email}:`, result.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${attendee.email}:`, error);
        errorCount++;
      }
    }
    
    return { successCount, errorCount };
  },
});

export const getAttendeesWithCodes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.neq(q.field("checked_in_at"), ""),
        q.neq(q.field("assigned_code"), undefined)
      ))
      .collect();
    
    return attendees;
  },
});

export const markEmailSent = mutation({
  args: {
    attendeeId: v.id("attendees"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Verify the attendee belongs to the current user
    const attendee = await ctx.db.get(args.attendeeId);
    if (!attendee || attendee.userId !== userId) {
      throw new Error("Attendee not found or not owned by current user");
    }
    
    await ctx.db.patch(args.attendeeId, {
      email_sent: true,
    });
  },
});

export const getEmailStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const allAttendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const checkedIn = allAttendees.filter(a => a.checked_in_at !== "");
    const withCodes = checkedIn.filter(a => a.assigned_code);
    const emailsSent = checkedIn.filter(a => a.email_sent);
    
    return {
      total: allAttendees.length,
      checkedIn: checkedIn.length,
      withCodes: withCodes.length,
      emailsSent: emailsSent.length,
    };
  },
});

export const getSentEmailsHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    const sentEmails = await ctx.db
      .query("sent_emails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return sentEmails;
  },
});

export const recordSentEmail = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    redemptionLink: v.string(),
    eventName: v.string(),
    checkedInAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    await ctx.db.insert("sent_emails", {
      userId,
      email: args.email,
      first_name: args.firstName,
      last_name: args.lastName,
      redemption_link: args.redemptionLink,
      event_name: args.eventName,
      checked_in_at: args.checkedInAt,
      sent_at: Date.now(),
    });
  },
});

export const deleteAllAttendees = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    
    // Get all attendees for this user
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Delete all attendees
    for (const attendee of attendees) {
      await ctx.db.delete(attendee._id);
    }
    
    return { deletedCount: attendees.length };
  },
});

export const deleteAttendee = mutation({
  args: {
    attendeeId: v.id("attendees"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Verify the attendee belongs to the current user
    const attendee = await ctx.db.get(args.attendeeId);
    if (!attendee || attendee.userId !== userId) {
      throw new Error("Attendee not found or not owned by current user");
    }
    
    await ctx.db.delete(args.attendeeId);
    return { success: true };
  },
});
