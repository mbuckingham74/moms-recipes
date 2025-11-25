# Claude Code Instructions

This file contains important instructions for Claude Code when working on this project.

## Claude API Model

**IMPORTANT: The correct Claude model ID is `claude-sonnet-4-5-20250929`**

- Do NOT use `claude-3-5-sonnet-*` - this is invalid/deprecated
- Do NOT use `claude-3-5-sonnet-20241022` - this does not exist
- All AI calls must go through `backend/src/services/claudeService.js` which has the correct model configured
- Never instantiate Anthropic client directly in controllers - always use ClaudeService

## Database

- **MySQL only** - SQLite is not supported
- Do not add SQLite fallbacks or conditional database code
- All environments (dev, test, production) use MySQL

## Environment Variables (Production Required)

- `DB_PASSWORD` - MySQL password
- `JWT_SECRET` - Must be at least 32 characters
- `CSRF_SECRET` - Required for CSRF protection
- `FRONTEND_URL` - For CORS configuration
- `ANTHROPIC_API_KEY` - Optional, enables AI features
