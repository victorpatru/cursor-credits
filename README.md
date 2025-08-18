# Send Hackathon Credits App
*Version 1.1*  
**[View Changelog](CHANGELOG.md)** - See version history and features

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

**Note:** This project uses pnpm workspaces to manage frontend and backend dependencies together. All backend commands can be run from the root directory (e.g., `pnpm db:generate`, `pnpm dev:backend`).

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
RESEND_API_KEY=re_...
MAIL_FROM=credits@example.com
FROM_NAME=

# Server Configuration
PORT=8787
CORS_ORIGIN=http://localhost:5173
```

**Required Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string
- `RESEND_API_KEY`: Get from [Resend.com](https://resend.com) - see Resend documentation for API key setup
- `MAIL_FROM`: Verified sender email address in Resend - see Resend documentation for custom domain setup
- `FROM_NAME`: (Optional) Display name for the sender
- `PORT`: Backend server port (default: 8787)
- `CORS_ORIGIN`: Frontend URL for CORS (default: http://localhost:5173)

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

**Alternative - Run Servers Separately:**

If you prefer to run them separately for debugging:

```bash
# Terminal 1 - Backend only
pnpm dev:backend

# Terminal 2 - Frontend only  
pnpm dev:frontend
```

## Available Scripts

### Root Directory Commands

- `pnpm dev` - Start both frontend and backend servers in parallel using coordinated script
- `pnpm dev:frontend` - Start frontend development server only (opens browser automatically)
- `pnpm dev:backend` - Start backend development server only
- `pnpm build` - Build both frontend and backend for production
- `pnpm build:frontend` - Build frontend only
- `pnpm build:backend` - Build backend only
- `pnpm db:generate` - Generate database migration files
- `pnpm db:push` - Push database schema changes to PostgreSQL
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm lint` - Run TypeScript type checking and build validation
- `pnpm kill-port` - Kill any process using port 8787 (useful for cleanup)

### Backend Commands

Backend-specific commands (can be run from root directory using workspace commands above, or directly from `backend/` directory):

- `pnpm dev` - Start backend development server with file watching
- `pnpm build` - Build backend for production  
- `pnpm start` - Start production server (requires build first)

### Docker Commands

- `docker-compose up -d` - Start PostgreSQL database in background
- `docker-compose ps` - Check database status
- `docker-compose logs postgres` - View database logs
- `docker-compose restart` - Restart database
- `docker-compose down` - Stop and remove database container

## Usage Guide

### 1. Export Attendee Data from Luma

Before uploading data to the app, you need to export your attendee list from Luma:

1. **Access Your Event in Luma:**
   - Go to [Luma](https://lu.ma) and navigate to your event
   - Go to the event management dashboard

2. **Filter for Checked-in Attendees:**
   - In the attendees section, apply filters to show only checked-in attendees
   - This ensures you only process people who actually attended the event

3. **Export the Data:**
   - Look for an "Export" or "Download" option
   - Export the attendee list as a CSV file
   - The exported CSV should include: `email`, `name`, and `checked_in_at` columns
   
   ![Luma Export Process](luma-export.png)

4. **Verify CSV Format:**
   - Ensure your CSV has the required columns:
     - `email`: Attendee email address
     - `name`: Full name
     - `checked_in_at`: Check-in timestamp

### 2. Upload Attendee Data

1. Navigate to `http://localhost:5173`
2. Upload a CSV file with attendee data
3. Required CSV columns:
   - `email`: Attendee email address
   - `name`: Full name
   - `checked_in_at`: Check-in timestamp (empty string for not checked in)

### 3. Assign Referral URLs

1. Paste referral URLs (one per line) in the "Assign Referral URLs" section
2. Click "Assign Referral URLs" to distribute them to checked-in attendees

### 4. Send Emails

1. Set a custom hackathon event name
2. Preview the email template
3. Click "Send Emails" to send credits to all checked-in attendees with assigned referral URLs
4. Monitor the progress and view sent email history

### 5. View Statistics

The dashboard shows:
- Total attendees uploaded
- Number of checked-in attendees
- Attendees with assigned referral URLs
- Emails sent successfully

## API Endpoints

The backend provides the following REST API endpoints:

- `POST /api/attendees/upload` - Upload CSV attendee data
- `GET /api/attendees/checked-in` - Get checked-in attendees
- `POST /api/attendees/assign-codes` - Assign referral URLs
- `GET /api/attendees/assignment-preview` - Preview referral URL assignments
- `POST /api/emails/send` - Send emails to attendees
- `GET /api/sent-emails` - Get sent email history
- `POST /api/sent-emails/delete-all` - Delete all sent email history
- `GET /api/stats` - Get system statistics
- `POST /api/attendees/delete-all` - Delete all attendees
- `DELETE /api/attendees/:id` - Delete specific attendee

## Database Schema

### Attendees Table
- `id`: Primary key
- `email`: Email address
- `name`: Full name
- `checkedInAt`: Check-in timestamp
- `assignedCode`: Referral URL
- `emailSent`: Boolean flag
- `createdAt`: Creation timestamp

### Sent Emails Table
- `id`: Primary key
- `email`: Recipient email
- `name`: Full name
- `redemptionLink`: Referral URL
- `eventName`: Event name
- `checkedInAt`: Original check-in time
- `sentAt`: Email sent timestamp

## TODO

### Development & Code Quality
- Format all files in project with prettier
- Add git commit hook for automatic prettier formatting
- Add git commit hook for conventional commit messages
- Add git pre-commit hook to run `pnpm build` before commits
- Set up GitHub Actions CI to run build checks on PRs  
- Add `pnpm typecheck` script for faster TypeScript validation during development
- Consider adding ESLint rules to catch common issues during development

### Testing & Validation
- Update template preview to match current template
- Add Cursor branding to email template
- Test consecutive sending of credits (multiple rounds)
- Test edge cases with mismatched quantities (more/fewer codes than attendees)
- Test behavior with duplicate emails or invalid referral URLs
- Test email sending with network interruptions

## Troubleshooting

### Common Issues

**Database Connection Error:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check the `DATABASE_URL` in `.env.local`
- Restart the database: `docker-compose restart`

**Email Sending Fails:**
- Verify your Resend API key is valid
- Ensure `MAIL_FROM` is a verified domain in Resend
- Check Resend dashboard for error logs

**Frontend Can't Connect to Backend:**
- Ensure backend is running on port 8787
- Check `CORS_ORIGIN` matches frontend URL
- Verify no firewall blocking the connection

**Environment Variables Not Loading:**
- Ensure `.env.local` exists in the root directory
- Check file permissions
- Restart the development servers

**Email Sending Issues:**
- Check rate limiting if emails are failing (600ms delay between sends)
- Monitor console logs for detailed error information
- Verify all attendees have both check-in status AND assigned referral URLs
- Check the dashboard counter showing attendees eligible for email (checked in + have referral URLs + not sent yet)

**Request Timeout Errors:**
- Frontend has 10-second timeout protection
- If requests timeout, check backend server logs
- Restart development servers if connection issues persist

### Logs and Debugging

**Backend Logs:**
```bash
cd backend
pnpm dev
# Watch server logs for errors
```

**Database Logs:**
```bash
docker-compose logs postgres
```

**Frontend Logs:**
Open browser developer console (F12) to see client-side errors.
