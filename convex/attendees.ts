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
    await requireAuth(ctx);
    
    // Clear existing data
    const existing = await ctx.db.query("attendees").collect();
    for (const attendee of existing) {
      await ctx.db.delete(attendee._id);
    }
    
    // Insert new data
    for (const row of args.csvData) {
      await ctx.db.insert("attendees", {
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
    await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
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
    await requireAuth(ctx);
    
    const checkedInAttendees = await ctx.db
      .query("attendees")
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
    await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
      .filter((q) => q.neq(q.field("checked_in_at"), ""))
      .collect();
    
    return attendees.map(attendee => ({
      first_name: attendee.first_name,
      email: attendee.email,
      assigned_code: attendee.assigned_code || "No code assigned",
    }));
  },
});

export const sendEmails = action({
  args: {},
  handler: async (ctx) => {
    const attendees = await ctx.runQuery(api.attendees.getAttendeesWithCodes);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const attendee of attendees) {
      try {
        // Simulate email sending (replace with actual email service)
        console.log(`Sending email to ${attendee.email}: Hi ${attendee.first_name}, your code is: ${attendee.assigned_code}`);
        
        // Mark as sent
        await ctx.runMutation(api.attendees.markEmailSent, {
          attendeeId: attendee._id,
        });
        
        successCount++;
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
    await requireAuth(ctx);
    
    const attendees = await ctx.db
      .query("attendees")
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
    await requireAuth(ctx);
    
    await ctx.db.patch(args.attendeeId, {
      email_sent: true,
    });
  },
});

export const getEmailStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    
    const allAttendees = await ctx.db.query("attendees").collect();
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
