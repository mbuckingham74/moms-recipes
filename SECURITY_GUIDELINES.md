# Security & Configuration Guidelines

## 🔐 Core Principles

### ✅ DO:
1. **Use environment variables for ALL sensitive data**
   - API keys
   - Database passwords
   - Admin credentials
   - JWT secrets
   - Third-party service tokens

2. **Keep .env files out of git**
   - Already in `.gitignore`
   - Never commit `.env` files
   - Only commit `.env.example` with placeholder values

3. **Use different credentials per environment**
   - Development credentials in local `.env`
   - Production credentials on server only
   - Never reuse passwords across environments

4. **Document required environment variables**
   - Update `.env.example` when adding new variables
   - Add comments explaining what each variable does
   - Document required vs. optional variables

### ❌ DON'T:
1. **Never hardcode credentials in source code**
   - No usernames in `.js` files
   - No passwords in scripts
   - No API keys in frontend code

2. **Never commit sensitive data**
   - Check before every commit
   - Use `git diff` to review changes
   - If accidentally committed, rotate credentials immediately

3. **Never log sensitive data**
   - Don't console.log passwords
   - Don't log API keys
   - Sanitize error messages

4. **Never expose credentials in URLs or query params**
   - Use headers for tokens
   - Use request body for credentials
   - Use POST for authentication

---

## 📝 Environment Variable Naming Convention

### Format: `CATEGORY_DESCRIPTOR_TYPE`

**Examples:**
```env
# Authentication
JWT_SECRET=...
JWT_EXPIRES_IN=7d

# Admin Users
ADMIN1_USERNAME=...
ADMIN1_PASSWORD=...
ADMIN1_EMAIL=...

# Database
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...

# External APIs
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://...
```

---

## 🔒 Password Requirements

### Admin Passwords Must:
- Be at least 12 characters long
- Contain uppercase and lowercase letters
- Contain numbers
- Contain special characters
- Not be dictionary words
- Be unique per user

### Password Storage:
- ✅ Always hash with bcrypt (10+ rounds)
- ✅ Store only hashes, never plaintext
- ❌ Never log passwords
- ❌ Never send passwords in responses

---

## 🚨 What To Do If Credentials Are Leaked

### Immediate Actions:
1. **Rotate the compromised credentials**
   - Change passwords immediately
   - Generate new API keys
   - Update all environments

2. **Revoke git history (if committed)**
   ```bash
   # Use git-filter-branch or BFG Repo-Cleaner
   # Force push to rewrite history
   # Notify all team members
   ```

3. **Audit access logs**
   - Check for unauthorized access
   - Look for suspicious activity
   - Document the incident

4. **Update affected services**
   - Rotate API keys at provider
   - Update server environment variables
   - Restart services with new credentials

---

## 📋 Pre-Commit Checklist

Before every `git commit`:

- [ ] No credentials in code changes
- [ ] `.env` file not staged
- [ ] `.env.example` updated if needed
- [ ] No API keys visible
- [ ] No hardcoded passwords
- [ ] Sensitive data sanitized in logs

---

## 🔐 API Key Security

### Backend (Node.js):
```javascript
// ✅ CORRECT
const apiKey = process.env.ANTHROPIC_API_KEY;

// ❌ WRONG
const apiKey = 'sk-ant-api03-...';
```

### Frontend (React):
```javascript
// ⚠️ WARNING: Never use API keys in frontend
// Frontend code is visible to users
// All API calls with keys should go through backend

// ❌ WRONG - Exposed to users!
const apiKey = import.meta.env.VITE_API_KEY;

// ✅ CORRECT - Proxy through backend
const response = await api.post('/admin/some-action');
```

---

## 🛡️ Production Deployment

### Before deploying:

1. **Generate new production secrets**
   ```bash
   # Generate random JWT secret
   openssl rand -base64 32

   # Generate strong password
   openssl rand -base64 24
   ```

2. **Set environment variables on server**
   ```bash
   # Never copy .env from dev to production
   # Set each variable individually
   ssh user@server
   nano ~/moms-recipes/.env
   # Or use environment variable management tool
   ```

3. **Verify credentials are different from dev**
   - Production DB password ≠ Dev DB password
   - Production admin password ≠ Dev admin password
   - Production JWT secret ≠ Dev JWT secret

4. **Test after deployment**
   - Verify authentication works
   - Check database connectivity
   - Test API integrations

---

## 📚 Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Twelve-Factor App: Config](https://12factor.net/config)
- [npm: dotenv](https://www.npmjs.com/package/dotenv)

---

## 🎯 Questions?

If unsure whether something should be an environment variable, ask:

1. Is this value different between dev/staging/production? → **Environment variable**
2. Is this value sensitive or secret? → **Environment variable**
3. Would I be comfortable posting this on Twitter? → **If no, environment variable**
4. Does this change based on where the app runs? → **Environment variable**

**When in doubt, use an environment variable!**

---

*Last updated: November 2024*
