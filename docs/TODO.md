# TODO

## Development & Code Quality
- Format all files in project with prettier
- Add git commit hook for automatic prettier formatting
- Add git commit hook for conventional commit messages
- Add git pre-commit hook to run `pnpm build` before commits
- Set up GitHub Actions CI to run build checks on PRs  
- Add `pnpm typecheck` script for faster TypeScript validation during development
- Consider adding ESLint rules to catch common issues during development

## Testing & Validation
- Update template preview to match current template
- Add Cursor branding to email template
- Test consecutive sending of credits (multiple rounds)
- Test edge cases with mismatched quantities (more/fewer codes than attendees)
- Test behavior with duplicate emails or invalid referral URLs
- Test email sending with network interruptions
