# API Endpoints

The backend provides the following REST API endpoints:

## Attendees
- `POST /api/attendees/upload` - Upload CSV attendee data
- `GET /api/attendees/checked-in` - Get checked-in attendees
- `POST /api/attendees/assign-codes` - Assign referral URLs
- `GET /api/attendees/assignment-preview` - Preview referral URL assignments
- `POST /api/attendees/delete-all` - Delete all attendees
- `DELETE /api/attendees/:id` - Delete specific attendee

## Emails
- `POST /api/emails/send` - Send emails to attendees
- `GET /api/sent-emails` - Get sent email history
- `POST /api/sent-emails/delete-all` - Delete all sent email history

## System
- `GET /api/stats` - Get system statistics
