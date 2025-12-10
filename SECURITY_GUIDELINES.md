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

## 🌐 URL Import & SSRF Protection

### Overview

The URL recipe import feature (`/api/admin/import-url`) allows admins to fetch recipes from external websites. This creates a **Server-Side Request Forgery (SSRF)** attack surface that must be carefully protected.

**Why SSRF is dangerous:**
- Attackers could probe internal network services
- Access cloud metadata endpoints (AWS/GCP credentials)
- Scan internal infrastructure through the server
- Exfiltrate data from internal services

### Protection Layers Implemented

The `UrlScraper` service (`backend/src/services/urlScraper.js`) implements multiple defense layers:

#### 1. Protocol Restriction
- Only `http://` and `https://` URLs allowed
- Blocks `file://`, `ftp://`, `gopher://`, etc.

#### 2. Hostname Blocklist
```javascript
// Explicitly blocked hostnames
- localhost
- metadata.google.internal (GCP metadata)
- metadata
- 169.254.169.254 (AWS/cloud metadata)
- *.internal (any .internal domain)
- *.local (any .local domain)
```

#### 3. IPv4 Private Range Blocking
All RFC1918 and special-use IPv4 ranges are blocked:
| Range | Description |
|-------|-------------|
| `127.0.0.0/8` | Loopback |
| `10.0.0.0/8` | Private Class A |
| `172.16.0.0/12` | Private Class B |
| `192.168.0.0/16` | Private Class C |
| `169.254.0.0/16` | Link-local |
| `0.0.0.0/8` | Current network |
| `100.64.0.0/10` | Carrier-grade NAT |
| `224.0.0.0/4` | Multicast |
| `240.0.0.0/4` | Reserved |

#### 4. IPv6 Private Range Blocking
| Range | Description |
|-------|-------------|
| `::1` | Loopback |
| `fe80::/10` | Link-local |
| `fc00::/7` | Unique local (fc/fd) |
| `ff00::/8` | Multicast |
| `::` | Unspecified |

#### 5. IPv4-in-IPv6 Detection (Critical!)
Attackers can embed private IPv4 addresses in IPv6 format to bypass simple checks:

| Format | Example | Attack Vector |
|--------|---------|---------------|
| IPv4-mapped | `::ffff:127.0.0.1` | Loopback bypass |
| IPv4-mapped hex | `::ffff:7f00:1` | Loopback bypass |
| IPv4-compatible | `::127.0.0.1` | Loopback bypass |
| 6to4 | `2002:7f00:1::` | Embeds IPv4 in first 32 bits |
| Teredo | `2001:0000:...` | Complex encoding (blocked entirely) |

**All embedded IPv4 addresses are extracted and validated against the IPv4 blocklist.**

#### 6. DNS Resolution Validation
- Resolves **both** A (IPv4) and AAAA (IPv6) records
- Validates ALL resolved IPs before connecting
- Prevents DNS rebinding attacks

#### 7. Safe Redirect Handling
- Automatic redirects disabled (`redirect: 'manual'`)
- Each redirect destination is validated before following
- Maximum 5 redirects to prevent infinite loops
- Prevents redirect-based SSRF (e.g., `example.com` → `http://169.254.169.254`)

#### 8. Request Limits
| Limit | Value | Purpose |
|-------|-------|---------|
| Timeout | 15 seconds | Prevent slow-loris attacks |
| Max size | 5 MB | Prevent memory exhaustion |
| Content-type | HTML only | Reject binary/non-HTML |

### Adding New URL-Fetching Features

**⚠️ IMPORTANT: If you add any new feature that fetches user-supplied URLs, you MUST:**

1. **Use the `UrlScraper` service** - Never use raw `fetch()` with user URLs
2. **Or implement equivalent protections** - All 8 layers listed above
3. **Review with security mindset** - Consider all bypass vectors
4. **Test SSRF vectors** - Use test cases like:
   ```
   http://127.0.0.1/
   http://localhost/
   http://[::1]/
   http://169.254.169.254/latest/meta-data/
   http://[::ffff:127.0.0.1]/
   http://[2002:7f00:1::]/
   http://example.com/ (that redirects to internal IP)
   ```

### Code Example - Safe URL Fetching

```javascript
// ✅ CORRECT - Use UrlScraper for user-supplied URLs
const UrlScraper = require('../services/urlScraper');
const result = await UrlScraper.scrape(userSuppliedUrl);

// ❌ WRONG - Direct fetch with user URL (SSRF vulnerable!)
const response = await fetch(userSuppliedUrl);
```

### Testing SSRF Protection

Run these test cases to verify protection:
```bash
# Should all be rejected
curl -X POST /api/admin/import-url -d '{"url":"http://127.0.0.1/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://localhost/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://169.254.169.254/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://[::1]/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://[::ffff:127.0.0.1]/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://10.0.0.1/"}'
curl -X POST /api/admin/import-url -d '{"url":"http://192.168.1.1/"}'
```

---

## 📚 Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
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

---

## 🛠️ Security Patch History

| Date | CVE | Severity | Component | Action |
|------|-----|----------|-----------|--------|
| 2025-12-09 | CVE-2025-55182 | Critical (CVSS 10.0) | React | Updated React 19.2.0 → 19.2.1 |
| 2025-12-09 | N/A | High | Matomo | Changed protocol-relative URL to explicit HTTPS |
| 2025-12-09 | N/A | Medium | AuthContext | Fixed transient error handling to prevent false logouts |

### CVE-2025-55182 (React2Shell)
- **Affected**: React Server Components in versions 19.0, 19.1.0, 19.1.1, 19.2.0
- **Impact**: Unauthenticated remote code execution via unsafe deserialization
- **This app's exposure**: Low - uses client-side Vite/React, not React Server Components
- **Action taken**: Updated to patched version as security best practice

### Matomo HTTPS Enforcement
- **Issue**: Protocol-relative URL (`//matomo...`) could allow downgrade attacks
- **Fix**: Changed to explicit `https://matomo.tachyonfuture.com/`
- **File**: `frontend/index.html`

### AuthContext Transient Error Handling
- **Issue**: Network blips or 500 errors on `/auth/me` caused false redirects to login
- **Fix**: Added `authCheckFailed` state; ProtectedRoute shows retry option instead of redirecting
- **Files**: `frontend/src/contexts/AuthContext.jsx`, `frontend/src/components/ProtectedRoute.jsx`

### Monitoring for New CVEs
1. Run `npm audit` regularly to check for known vulnerabilities
2. Subscribe to [Node.js security releases](https://nodejs.org/en/blog/vulnerability/)
3. Monitor [React security advisories](https://react.dev/blog)
4. Check [Express.js security releases](https://expressjs.com/en/advanced/security-updates.html)

---

*Last updated: December 2025 (Frontend security improvements)*
