# Database Schema

## Attendees Table
- `id`: Primary key
- `email`: Email address
- `name`: Full name
- `checkedInAt`: Check-in timestamp
- `assignedCode`: Referral URL
- `emailSent`: Boolean flag
- `createdAt`: Creation timestamp

## Sent Emails Table
- `id`: Primary key
- `email`: Recipient email
- `name`: Full name
- `redemptionLink`: Referral URL
- `eventName`: Event name
- `checkedInAt`: Original check-in time
- `sentAt`: Email sent timestamp
