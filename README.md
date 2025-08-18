# Cursor Credits Manager
**Version 1.1** - See [CHANGELOG](CHANGELOG.md)

A tool for managing event attendees and automatically distributing Cursor credits to checked-in hackathon participants.

## Quick Start

**Prerequisites:** Node.js v18+, pnpm, Docker

```bash
# 1. Clone and install
git clone <repository-url>
cd cursor-credits
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Resend API key and email settings

# 3. Start database and run migrations
docker-compose up -d
pnpm db:push

# 4. Start development servers
pnpm dev
# Opens http://localhost:5173 automatically
```

## Features

- Upload attendee CSV data
- Track checked-in attendees  
- Assign referral URLs to attendees
- Send automated emails with credits
- View email statistics and history
- PostgreSQL database with Drizzle ORM
- Delete all data functionality with confirmation
- Improved error handling with timeout and retry logic

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono (Node.js) + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Resend API
- **Package Manager**: pnpm

## Commands

- `pnpm dev` - Start development servers
- `pnpm build` - Build for production
- `pnpm db:push` - Update database schema
- `pnpm db:studio` - Open database management interface
- `docker-compose up -d` - Start PostgreSQL database

## Usage Guide

### 1. Upload Attendee Data

1. **Export from Luma:** Filter attendees to show only "Checked In" before exporting (see image below)
2. Export as CSV and ensure it includes: `email`, `name`, `checked_in_at` columns
3. Navigate to `http://localhost:5173`
4. Upload the CSV file

![Luma Export Process](luma-export.png)

### 2. Assign Referral URLs

1. Paste referral URLs (one per line) in the "Assign Referral URLs" section
2. Click "Assign Referral URLs" to distribute them to checked-in attendees

### 3. Send Emails

1. Set a custom hackathon event name
2. Click "Send Emails" to send credits to all checked-in attendees with assigned referral URLs
3. Monitor the progress and view statistics on the dashboard

## Troubleshooting

**Database Issues:**
- Check PostgreSQL is running: `docker-compose ps`
- Verify `DATABASE_URL` in `.env.local`
- View database logs: `docker-compose logs postgres`

**Email Issues:**
- Verify Resend API key and domain are set up correctly
- Check attendees have check-in status AND referral URLs
- Monitor server logs for detailed error information

**Connection Issues:**
- Ensure backend is running on port 8787
- Check `.env.local` file exists and has correct values
- Restart servers: Stop `pnpm dev` and restart

**Logs:**
- Server logs: Visible when running `pnpm dev`
- Frontend logs: Browser developer console (F12)

## Documentation

- [API Endpoints](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Development TODO](docs/TODO.md)
