// IMPORTANT: this is a Convex Node Action
"use node";
import { action } from "./_generated/server";
import { render, pretty } from "@react-email/render";
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { HackathonCodeEmail } from "./emailTemplate";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
  testMode: false, // Set to true for development
});

export const sendHackathonCodeEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
    redemptionLink: v.string(),
    eventName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      // Generate the HTML from your JSX template
      const html = await pretty(
        await render(
          <HackathonCodeEmail
            firstName={args.firstName}
            redemptionLink={args.redemptionLink}
            eventName={args.eventName || "Cursor Bucharest Hackathon"}
          />
        )
      );

      // Send the email using the Resend component
      const emailId = await resend.sendEmail(ctx, {
        from: "code@commenterpro.com", // Update with your domain
        to: args.to,
        subject: `Your hackathon credits are ready!`,
        html,
      });

      return { success: true, emailId };
    } catch (error) {
      console.error(`Failed to send email to ${args.to}:`, error);
      return { success: false, error: String(error) };
    }
  },
});