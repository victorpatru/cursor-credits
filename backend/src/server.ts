import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../.env.local") });
import { serve } from "@hono/node-server";
import { createServer } from "http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { db, pool } from "./db";
import { attendees, sentEmails } from "./db/schema";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { HackathonCodeEmail } from "./emailTemplate";

const app = new Hono();
app.use("*", cors({ origin: process.env.CORS_ORIGIN ?? "*", credentials: true }));

const resend = new Resend(process.env.RESEND_API_KEY);

const UploadCsvSchema = z.object({
  csvData: z.array(z.object({
    email: z.string(),
    name: z.string(),
    checked_in_at: z.string(),
  })),
});

app.post("/api/attendees/upload", async (c) => {
  const { csvData } = UploadCsvSchema.parse(await c.req.json());
  await db.transaction(async (tx) => {
    await tx.delete(attendees);
    if (csvData.length) {
      await tx.insert(attendees).values(
        csvData.map((r) => ({
          email: r.email,
          name: r.name,
          checkedInAt: r.checked_in_at,
          emailSent: false,
        }))
      );
    }
  });
  return c.json({ count: csvData.length });
});

app.get("/api/attendees/checked-in", async (c) => {
  const rows = await db.select().from(attendees).where(ne(attendees.checkedInAt, ""));
  return c.json(rows);
});

const AssignCodesSchema = z.object({ codes: z.array(z.string()) });

app.post("/api/attendees/assign-codes", async (c) => {
  const { codes } = AssignCodesSchema.parse(await c.req.json());
  const rows = await db.select({ id: attendees.id }).from(attendees).where(ne(attendees.checkedInAt, ""));
  const count = Math.min(rows.length, codes.length);
  for (let i = 0; i < count; i++) {
    await db.update(attendees).set({ assignedCode: codes[i] }).where(eq(attendees.id, rows[i].id));
  }
  return c.json({ assigned: count });
});

app.get("/api/attendees/assignment-preview", async (c) => {
  const rows = await db
    .select({ id: attendees.id, name: attendees.name, email: attendees.email, assigned_code: attendees.assignedCode })
    .from(attendees)
    .where(ne(attendees.checkedInAt, ""));
  return c.json(rows.map((r) => ({ ...r, assigned_code: r.assigned_code ?? "No code assigned" })));
});

const SendEmailsSchema = z.object({ eventName: z.string().min(1) });

app.post("/api/emails/send", async (c) => {
  const { eventName } = SendEmailsSchema.parse(await c.req.json());
  
  console.log(`\nStarting email sending process for event: "${eventName}"`);
  
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM environment variable is required but not set");
  }
  
  // Build the "from" field with optional display name
  const fromEmail = process.env.MAIL_FROM;
  const fromName = process.env.FROM_NAME;
  const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  
  console.log(`Sending emails from: ${fromField}`);
  
  // Get attendees who are checked in, have codes, AND haven't been sent emails yet
  const list = await db
    .select()
    .from(attendees)
    .where(and(
      ne(attendees.checkedInAt, ""), 
      isNotNull(attendees.assignedCode),
      ne(attendees.emailSent, true)  // Only get those who haven't been sent emails yet
    ));

  console.log(`Found ${list.length} attendees ready for email (checked in + have codes + not sent yet)`);
  
  // Also get counts for debugging
  const allWithCodes = await db
    .select({ checkedInAt: attendees.checkedInAt, emailSent: attendees.emailSent })
    .from(attendees)
    .where(isNotNull(attendees.assignedCode));
  
  const totalWithCodes = allWithCodes.length;
  const checkedInWithCodes = allWithCodes.filter(a => a.checkedInAt !== "").length;
  const alreadySent = allWithCodes.filter(a => a.emailSent).length;
  
  console.log(`Email Delivery Status:`);
  console.log(`  Codes assigned: ${totalWithCodes}`);
  console.log(`  Emails delivered: ${alreadySent}`);
  console.log(`  Pending delivery: ${list.length}`);
  console.log(`  Validation: ${totalWithCodes} - ${alreadySent} = ${totalWithCodes - alreadySent} (should equal ${list.length})`);
  
  if (list.length === 0) {
    console.log(`WARNING: No attendees to send emails to. Check if:`);
    console.log(`  1. Attendees are checked in (checkedInAt not empty)`);
    console.log(`  2. Attendees have assigned codes`); 
    console.log(`  3. Emails haven't already been sent`);
    return c.json({ successCount: 0, errorCount: 0 });
  }
  
  let successCount = 0,
    errorCount = 0,
    skippedCount = 0;

  // Helper function to wait between emails (rate limiting)
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Helper function to retry with exponential backoff
  const sendEmailWithRetry = async (emailData: any, attendee: any, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`    Sending email to ${attendee.email} with code ${attendee.assignedCode} (attempt ${attempt}/${maxRetries})`);
        
        const emailResult = await resend.emails.send(emailData);
        
        console.log(`    Resend response for ${attendee.email}:`, JSON.stringify(emailResult, null, 2));

        // Check if the email was actually sent successfully
        if (!emailResult.data?.id) {
          console.log(`    ERROR: No ID returned for ${attendee.email} (code: ${attendee.assignedCode})`);
          console.log(`    Response data:`, emailResult.data);
          console.log(`    Response error:`, emailResult.error);
          
          // If it's a rate limit error and we have retries left, wait longer and retry
          if (emailResult.error?.statusCode === 429 && attempt < maxRetries) {
            const backoffDelay = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
            console.log(`    Rate limited, waiting ${backoffDelay}ms before retry ${attempt + 1}`);
            await sleep(backoffDelay);
            continue;
          }
          
          throw new Error(`Resend failed to send email to ${attendee.email}: ${JSON.stringify(emailResult.error)}`);
        }

        console.log(`    SUCCESS: Email sent to ${attendee.email} (code: ${attendee.assignedCode}, Resend ID: ${emailResult.data.id})`);
        return emailResult;
        
      } catch (error) {
        console.log(`    FAILED: Attempt ${attempt} for ${attendee.email} (code: ${attendee.assignedCode}):`, error);
        
        if (attempt === maxRetries) {
          throw error; // Re-throw on final attempt
        }
        
        // Wait before retry (exponential backoff)
        const backoffDelay = 1000 * Math.pow(2, attempt);
        console.log(`    Waiting ${backoffDelay}ms before retry ${attempt + 1}`);
        await sleep(backoffDelay);
      }
    }
  };

  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const attendeeInfo = `Attendee ${i + 1}/${list.length}: ${a.name || 'No name'} (${a.email || 'No email'})`;
    
    console.log(`\nProcessing ${attendeeInfo}`);
    console.log(`  Redemption code: ${a.assignedCode}`);
    
    try {
      // Validate email and assigned code
      if (!a.email?.trim()) {
        console.log(`  SKIPPED - No email address for ${a.name || 'attendee'} (would have used code: ${a.assignedCode || 'N/A'})`);
        errorCount++;
        continue;
      }
      
      if (!a.assignedCode) {
        console.log(`  SKIPPED - No assigned code for ${a.email}`);
        errorCount++;
        continue;
      }
      
      console.log(`  Rendering email for ${a.email} with code: ${a.assignedCode}`);
      
      const html = await render(
        HackathonCodeEmail({
          name: a.name || "there",
          redemptionLink: a.assignedCode,
          eventName: eventName,
        })
      );

      // Send email with retry logic
      const emailResult = await sendEmailWithRetry({
        from: fromField,
        to: a.email,
        subject: "Your hackathon credits are ready!",
        html,
      }, a);

      console.log(`  Updating database for ${a.email} (code: ${a.assignedCode})`);
      
      await db.update(attendees).set({ emailSent: true }).where(eq(attendees.id, a.id));
      await db.insert(sentEmails).values({
        email: a.email,
        name: a.name || "",
        redemptionLink: a.assignedCode,
        eventName: eventName,
        checkedInAt: a.checkedInAt,
      });

      successCount++;
      console.log(`  COMPLETED: ${a.email} → ${a.assignedCode}`);
      
      // Rate limiting: wait 600ms between emails (allows ~1.6 emails/second, safely under 2/second limit)
      if (i < list.length - 1) { // Don't wait after the last email
        console.log(`  Waiting 600ms for rate limiting`);
        await sleep(600);
      }
      
    } catch (error) {
      console.log(`  FAILED to send email to ${a.email} (code: ${a.assignedCode}):`, error);
      console.log(`  CRITICAL: Code ${a.assignedCode} was NOT delivered to ${a.email}!`);
      errorCount++;
    }
  }
  
  console.log(`\nEmail Sending Summary:`);
  console.log(`  Successfully sent: ${successCount}`);
  console.log(`  Failed/Invalid: ${errorCount}`);
  console.log(`  Total processed: ${list.length}`);
  
  return c.json({ successCount, errorCount });
});

app.get("/api/stats", async (c) => {
  const all = await db
    .select({ checkedInAt: attendees.checkedInAt, assignedCode: attendees.assignedCode, emailSent: attendees.emailSent })
    .from(attendees);
  const total = all.length;
  const checkedIn = all.filter((a) => a.checkedInAt !== "").length;
  const withCodes = all.filter((a) => a.assignedCode).length;
  // This is the count that actually matters for email sending: checked in + has code + not sent yet
  const eligibleForEmail = all.filter((a) => a.checkedInAt !== "" && a.assignedCode && !a.emailSent).length;
  const emailsSent = all.filter((a) => a.emailSent).length;
  return c.json({ total, checkedIn, withCodes, emailsSent, eligibleForEmail });
});

app.get("/api/sent-emails", async (c) => {
  const rows = await db.select().from(sentEmails).orderBy(sentEmails.sentAt);
  return c.json(rows);
});

app.post("/api/attendees/delete-all", async (c) => {
  const res = await db.delete(attendees);
  return c.json({ deletedCount: Number((res as any).rowCount ?? 0) });
});

app.post("/api/sent-emails/delete-all", async (c) => {
  const res = await db.delete(sentEmails);
  return c.json({ deletedCount: Number((res as any).rowCount ?? 0) });
});

app.delete("/api/attendees/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(attendees).where(eq(attendees.id, id));
  return c.json({ success: true });
});

const port = Number(process.env.PORT ?? 8787);

// Create proper Node.js HTTP server for better shutdown handling
const server = createServer(async (req, res) => {
  try {
    // Properly handle request body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks).toString();
      }
    }

    // Create request options
    const requestOptions: RequestInit = {
      method: req.method,
      headers: req.headers as HeadersInit,
    };

    // Add body and duplex option if needed
    if (body !== undefined) {
      requestOptions.body = body;
      (requestOptions as any).duplex = 'half'; // Required for Node.js with body
    }

    const response = await app.fetch(
      new Request(new URL(req.url || '/', `http://${req.headers.host}`), requestOptions)
    );

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const text = await response.text();
      res.end(text);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Hono listening on http://localhost:${port}`);
});

// Proper graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    console.log('✅ Server closed');
    
    // Close database connections
    pool.end().then(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    }).catch((dbErr) => {
      console.error('Error closing database:', dbErr);
      process.exit(1);
    });
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Force shutting down...');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});


