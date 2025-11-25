# Claude Code Instructions

This file contains important instructions for Claude Code when working on this project.

## AI Service (Multi-Provider)

The app supports multiple AI providers: **Anthropic Claude**, **OpenAI GPT-4**, and **Google Gemini**.

- All AI calls must go through `backend/src/services/aiService.js` (provider-agnostic)
- Never instantiate AI provider clients directly in controllers - always use AIService
- Provider and model are configurable via Admin Panel or database settings
- API keys can be set via environment variables OR stored encrypted in the database
- The default Claude model ID is `claude-sonnet-4-5-20250929`
- Do NOT use deprecated model IDs like `claude-3-5-sonnet-*`

## Database

- **MySQL only** - SQLite is not supported
- Do not add SQLite fallbacks or conditional database code
- All environments (dev, test, production) use MySQL

## Environment Variables (Production Required)

- `DB_PASSWORD` - MySQL password
- `JWT_SECRET` - Must be at least 32 characters
- `CSRF_SECRET` - Required for CSRF protection
- `FRONTEND_URL` - For CORS configuration

### AI Provider Keys (Optional - at least one needed for AI features)

- `ANTHROPIC_API_KEY` - For Claude models
- `OPENAI_API_KEY` - For GPT-4 models
- `GOOGLE_API_KEY` - For Gemini models

Note: API keys can also be configured via the Admin Panel (stored encrypted in database).
