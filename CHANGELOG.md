# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0]

### Added
- `FROM_NAME` environment variable for custom sender names
- Rate limiting: 600ms delays between emails (required by Resend API)
- Retry logic with exponential backoff for email sending
- Graceful server shutdown handling
- Comprehensive email sending logs
- Delete all data functionality with confirmation
- Request timeout protection (10 seconds)
- Counter for attendees eligible for email sending
- Loading states and error handling
- `dev.js` script for coordinated server startup and shutdown

### Changed
- Email copy from "claim" to "redeem"
- Database schema: combined `first_name` and `last_name` into single `name` field (some users lacked first names)
- Terminology from "codes" to "referral URLs" throughout UI
- Email template: removed footer section and emojis according to Cursor's style guide

### Development
- Added workspace development rules
- Updated terminal handling to preserve logs
- Added CSV files to gitignore
- Migrated to pnpm workspaces for unified dependency management
- Single `pnpm install` command now installs all dependencies
- Added workspace-aware npm scripts for backend commands from root directory
- Unified build process: `pnpm build` now builds both frontend and backend

## [1.0.0] - Initial Release

- CSV upload and attendee management
- Email sending with React Email templates
- PostgreSQL database with Drizzle ORM
- REST API with Hono.js
- Frontend with React and Tailwind CSS
