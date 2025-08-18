# Send Hackathon Credits App
**Version 1.1** - See [CHANGELOG](CHANGELOG.md)

A full-stack application for managing hackathon attendees and sending email credits to checked-in participants.

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

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker](https://www.docker.com/) (for PostgreSQL database)
- [Git](https://git-scm.com/)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cursor-credits
```

### 2. Install Dependencies

Install all dependencies with a single command (uses pnpm workspaces):

```bash
pnpm install
```

**Note:** Uses pnpm workspaces - all commands run from root directory.

### 3. Set Up Environment Variables

Create environment files based on the example:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Database Configuration
DATABASE_URL=postgres://postgres:postgres@localhost:54320/send_hackathon

# Resend Email Service  
RESEND_API_KEY=re_...  # Get from resend.com
MAIL_FROM=credits@example.com  # Verified domain in Resend
FROM_NAME=  # Optional sender display name

# Server Configuration
PORT=8787
CORS_ORIGIN=http://localhost:5173
```

### 4. Start PostgreSQL Database

Using Docker Compose:

```bash
docker-compose up -d
```

This will start a PostgreSQL database on `localhost:54320`.

### 5. Set Up Database Schema

Run database migrations from the root directory:

```bash
pnpm db:push
```

This creates the necessary tables (`attendees` and `sent_emails`).

### 6. Start the Development Servers

From the root directory, run both frontend and backend servers in parallel:

```bash
pnpm dev
```

This will automatically start:
- Backend server on `http://localhost:8787`
- Frontend server on `http://localhost:5173` (opens in browser automatically)

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
