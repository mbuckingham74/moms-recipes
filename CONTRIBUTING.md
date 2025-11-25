# Contributing to Mom's Recipes

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8
- npm

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mbuckingham74/moms-recipes.git
   cd moms-recipes
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials and API keys
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## Development Guidelines

### Code Style

- Use meaningful variable and function names
- Keep functions focused and small
- Add comments for complex logic
- Follow existing patterns in the codebase

### Database

- **MySQL only** - Do not add SQLite fallbacks
- Use `query()` for GROUP BY statements, `execute()` for simple queries
- Use `LIMIT ?, ?` syntax (offset, count)

### AI Service

- All AI calls must go through `backend/src/services/aiService.js`
- Never instantiate AI provider clients directly in controllers
- Use model ID `claude-sonnet-4-5-20250929` for Claude (not deprecated IDs)

### Testing

- Write tests for new features
- Maintain 80%+ code coverage
- Run `npm test` before submitting PRs

## Submitting Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure tests pass: `npm test`
4. Update documentation if needed
5. Submit a PR with a clear description

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- List of specific changes

## Testing
- How you tested the changes

## Screenshots (if applicable)
```

## Project Structure

```
moms-recipes/
├── backend/           # Express API server
│   ├── src/
│   │   ├── config/    # Database and JWT config
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/  # AI service, etc.
│   └── tests/
├── frontend/          # React application
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
├── docs/              # Documentation
└── scripts/           # Deployment scripts
```

## Need Help?

- Check existing [issues](https://github.com/mbuckingham74/moms-recipes/issues)
- Read the [documentation](docs/README.md)
- Open a new issue for questions

## License

By contributing, you agree that your contributions will be licensed under the project's license.
