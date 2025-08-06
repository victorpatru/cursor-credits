# Resend Email Integration Setup

This document explains how to set up Resend email integration for sending hackathon codes to attendees.

## Prerequisites

1. Create a [Resend account](https://resend.com)
2. Get your Resend API key from the dashboard
3. (Optional) Set up a custom domain for better deliverability

## Environment Variables

Add these environment variables to your Convex deployment:

### Required
```bash
RESEND_API_KEY=re_xxxxxxxxxx  # Your Resend API key
```

### Optional
```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxx  # For webhook events (recommended for production)
CONVEX_SITE_URL=https://your-domain.com  # For email template assets
```

## Setting Environment Variables

### Development
```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxx
```

### Production
```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxx --prod
```

## Email Template Configuration

The email template is located in `convex/emailTemplate.tsx` and includes:

- **Customizable branding**: Update the event name and styling
- **Responsive design**: Works on all devices
- **Professional styling**: Based on Slack's email template design
- **Code highlighting**: Hackathon codes are prominently displayed

### Customizing the Template

1. **Event Name**: Update the `eventName` prop when calling `sendHackathonCodeEmail`
2. **Branding**: Replace the logo section in `emailTemplate.tsx`
3. **Styling**: Modify the styles at the bottom of the file
4. **Content**: Update the email copy and messaging

## Usage

### Sending Individual Emails
```typescript
// From any action
const result = await ctx.runAction(api.emails.sendHackathonCodeEmail, {
  to: "attendee@example.com",
  firstName: "John",
  hackathonCode: "HAC-K123",
  eventName: "Send AI Hackathon" // Optional
});
```

### Bulk Email Sending
The existing `sendEmails` action automatically uses Resend to send emails to all attendees with assigned codes.

## Email Features

- ✅ **Queueing**: Send as many emails as you want
- ✅ **Batching**: Automatically batches large groups  
- ✅ **Durable execution**: Ensures delivery even with failures
- ✅ **Idempotency**: Prevents duplicate emails
- ✅ **Rate limiting**: Respects Resend API limits

## Test Mode

For development, emails are sent in test mode by default. To send to real addresses:

1. Update `convex/emails.tsx` and set `testMode: false`
2. Or keep `testMode: true` and emails will only go to verified addresses

## Webhook Setup (Optional but Recommended)

1. Add webhook endpoint to `convex/http.ts`:
```typescript
import { resend } from "./emails";

http.route({
  path: "/resend-webhook",
  method: "POST", 
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});
```

2. Add webhook URL to Resend dashboard: `https://your-deployment.convex.site/resend-webhook`
3. Set `RESEND_WEBHOOK_SECRET` environment variable

## Customization Examples

### Change Email Sender
Update the `from` field in `convex/emails.tsx`:
```typescript
from: "Your Event <noreply@yourdomain.com>"
```

### Add Event Logo
Update `emailTemplate.tsx` to include your logo:
```typescript
<Img
  src={`${baseUrl}/your-logo.png`}
  width="120"
  height="36"
  alt="Your Event"
/>
```

### Customize Email Subject
Update the subject in `convex/emails.tsx`:
```typescript
subject: `🚀 Your ${args.eventName} code: ${args.hackathonCode}`
```

## Troubleshooting

1. **Emails not sending**: Check your `RESEND_API_KEY` is set correctly
2. **Test mode issues**: Ensure you're sending to verified email addresses in test mode
3. **Template errors**: Check the console for React Email rendering errors
4. **Domain issues**: Set up a custom domain in Resend for better deliverability

## Production Checklist

- [ ] Set `testMode: false` in production
- [ ] Configure custom domain in Resend
- [ ] Set up webhook for delivery tracking
- [ ] Test email delivery with real addresses
- [ ] Monitor email metrics in Resend dashboard