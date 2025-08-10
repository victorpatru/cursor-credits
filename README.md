# Send Hackathon Credits App

A full-stack application for managing hackathon attendees and sending email credits to checked-in participants.

## Features

- 📊 Upload attendee CSV data
- ✅ Track checked-in attendees
- 🎟️ Assign redemption codes to attendees
- 📧 Send automated emails with credits
- 📈 View email statistics and history
- 🗄️ PostgreSQL database with Drizzle ORM

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
cd send-hackathon-code
```

### 2. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd backend
pnpm install
cd ..
```

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
RESEND_API_KEY=re_your_actual_resend_api_key_here
MAIL_FROM=your-email@yourdomain.com

# Server Configuration
PORT=8787
CORS_ORIGIN=http://localhost:5173
```

**Required Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string
- `RESEND_API_KEY`: Get from [Resend.com](https://resend.com)
- `MAIL_FROM`: Verified sender email address in Resend
- `PORT`: Backend server port (default: 8787)
- `CORS_ORIGIN`: Frontend URL for CORS (default: http://localhost:5173)

### 4. Start PostgreSQL Database

Using Docker Compose:

```bash
docker-compose up -d
```

This will start a PostgreSQL database on `localhost:54320`.

### 5. Set Up Database Schema

Navigate to the backend directory and run the database migrations:

```bash
cd backend
pnpm db:push
cd ..
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
   - The exported CSV should include: `email`, `first_name`, `last_name`, and `checked_in_at` columns
   
   ![Luma Export Process](luma-export.png)

4. **Verify CSV Format:**
   - Ensure your CSV has the required columns:
     - `email`: Attendee email address
     - `first_name`: First name
     - `last_name`: Last name  
     - `checked_in_at`: Check-in timestamp

### 2. Upload Attendee Data

1. Navigate to `http://localhost:5173`
2. Upload a CSV file with attendee data
3. Required CSV columns:
   - `email`: Attendee email address
   - `first_name`: First name
   - `last_name`: Last name  
   - `checked_in_at`: Check-in timestamp (empty string for not checked in)

### 3. Assign Redemption Codes

1. Paste redemption codes (one per line) in the "Assign Codes" section
2. Click "Assign Codes" to distribute them to checked-in attendees

### 4. Send Emails

1. Set a custom hackathon event name
2. Preview the email template
3. Click "Send Emails" to send credits to all checked-in attendees with assigned codes
4. Monitor the progress and view sent email history

### 5. View Statistics

The dashboard shows:
- Total attendees uploaded
- Number of checked-in attendees
- Attendees with assigned codes
- Emails sent successfully

## API Endpoints

The backend provides the following REST API endpoints:

- `POST /api/attendees/upload` - Upload CSV attendee data
- `GET /api/attendees/checked-in` - Get checked-in attendees
- `POST /api/attendees/assign-codes` - Assign redemption codes
- `GET /api/attendees/assignment-preview` - Preview code assignments
- `POST /api/emails/send` - Send emails to attendees
- `GET /api/sent-emails` - Get sent email history
- `GET /api/stats` - Get system statistics
- `POST /api/attendees/delete-all` - Delete all attendees
- `DELETE /api/attendees/:id` - Delete specific attendee

## Database Schema

### Attendees Table
- `id`: Primary key
- `email`: Email address
- `firstName`: First name
- `lastName`: Last name
- `checkedInAt`: Check-in timestamp
- `assignedCode`: Redemption code
- `emailSent`: Boolean flag
- `createdAt`: Creation timestamp

### Sent Emails Table
- `id`: Primary key
- `email`: Recipient email
- `firstName`: First name
- `lastName`: Last name
- `redemptionLink`: Redemption code/link
- `eventName`: Event name
- `checkedInAt`: Original check-in time
- `sentAt`: Email sent timestamp

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
