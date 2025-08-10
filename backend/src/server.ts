import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../.env.local") });
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { db } from "./db";
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
    first_name: z.string(),
    last_name: z.string(),
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
          firstName: r.first_name,
          lastName: r.last_name,
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
    .select({ id: attendees.id, first_name: attendees.firstName, email: attendees.email, assigned_code: attendees.assignedCode })
    .from(attendees)
    .where(ne(attendees.checkedInAt, ""));
  return c.json(rows.map((r) => ({ ...r, assigned_code: r.assigned_code ?? "No code assigned" })));
});

const SendEmailsSchema = z.object({ eventName: z.string().optional() });

app.post("/api/emails/send", async (c) => {
  const { eventName } = SendEmailsSchema.parse(await c.req.json());
  
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM environment variable is required but not set");
  }
  const list = await db
    .select()
    .from(attendees)
    .where(and(ne(attendees.checkedInAt, ""), isNotNull(attendees.assignedCode)));

  let successCount = 0,
    errorCount = 0;

  for (const a of list) {
    try {
      if (!a.email?.trim() || !a.assignedCode) {
        errorCount++;
        continue;
      }
      const html = await render(
        HackathonCodeEmail({
          firstName: a.firstName || "there",
          redemptionLink: a.assignedCode,
          eventName: eventName || "Send AI Hackathon",
        }) as any
      );

      await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: a.email,
        subject: "Your hackathon credits are ready!",
        html,
      });

      await db.update(attendees).set({ emailSent: true }).where(eq(attendees.id, a.id));
      await db.insert(sentEmails).values({
        email: a.email,
        firstName: a.firstName || "",
        lastName: a.lastName || "",
        redemptionLink: a.assignedCode,
        eventName: eventName || "Send AI Hackathon",
        checkedInAt: a.checkedInAt,
      });

      successCount++;
    } catch {
      errorCount++;
    }
  }
  return c.json({ successCount, errorCount });
});

app.get("/api/stats", async (c) => {
  const all = await db
    .select({ checkedInAt: attendees.checkedInAt, assignedCode: attendees.assignedCode, emailSent: attendees.emailSent })
    .from(attendees);
  const total = all.length;
  const checkedIn = all.filter((a) => a.checkedInAt !== "").length;
  const withCodes = all.filter((a) => a.assignedCode).length;
  const emailsSent = all.filter((a) => a.emailSent).length;
  return c.json({ total, checkedIn, withCodes, emailsSent });
});

app.get("/api/sent-emails", async (c) => {
  const rows = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  return c.json(rows);
});

app.post("/api/attendees/delete-all", async (c) => {
  const res = await db.delete(attendees);
  return c.json({ deletedCount: Number((res as any).rowCount ?? 0) });
});

app.delete("/api/attendees/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(attendees).where(eq(attendees.id, id));
  return c.json({ success: true });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono listening on http://localhost:${port}`);
});


