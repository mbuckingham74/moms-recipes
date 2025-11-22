# CI/CD Pipeline Setup

This document describes the CI/CD pipeline for the Mom's Recipes application using GitHub Actions.

## Overview

The CI/CD pipeline consists of two simple workflows:

1. **CI (Continuous Integration)** - Tests and builds on every push/PR
2. **CD (Continuous Deployment)** - Deploys to production on main branch

## Workflows

### 1. CI (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**What it does:**
1. Installs backend dependencies
2. Runs Jest tests (backend)
3. Installs frontend dependencies
4. Runs ESLint (frontend)
5. Builds frontend with Vite

**Simple and fast** - All steps run in a single job, typically completes in 3-5 minutes.

---

### 2. CD (`.github/workflows/cd.yml`)

**Triggers:**
- Push to `main` branch (automatic after CI passes)
- Manual trigger via GitHub UI

**What it does:**
1. SSH to your production server
2. Pull latest code from GitHub
3. Run your existing `deploy.sh` script
4. Verify deployment with health checks

**Uses your existing deployment script** - No complex logic in GitHub Actions!

---

## Setup Instructions

### Step 1: Generate SSH Key (if needed)

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-moms-recipes" -f ~/.ssh/github_actions_key

# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github_actions_key.pub michael@tachyonfuture.com

# Test it works
ssh -i ~/.ssh/github_actions_key michael@tachyonfuture.com "echo 'SSH works!'"
```

### Step 2: Add GitHub Secret

Go to: https://github.com/mbuckingham74/moms-recipes/settings/secrets/actions

Add this secret:

| Secret Name | Value |
|-------------|-------|
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/github_actions_key` (entire file including BEGIN/END lines) |

**To get the private key:**
```bash
cat ~/.ssh/github_actions_key
# Copy the entire output to GitHub
```

### Step 3: Test It!

**Test CI:**
1. Create a branch and make a small change
2. Push to GitHub
3. Create a PR → CI will run automatically

**Test CD:**
1. Go to GitHub → Actions → CD → "Run workflow"
2. Or push to `main` branch to trigger automatic deployment

---

## How It Works

### On Pull Request:
- ✅ Tests run
- ✅ Linting runs
- ✅ Build runs
- ❌ **Does NOT deploy**

### On Push to Main:
- ✅ Tests run
- ✅ Linting runs
- ✅ Build runs
- ✅ **Automatically deploys to production**

---

## Troubleshooting

### SSH Connection Failed
```bash
# Verify your SSH key is correct
ssh -i ~/.ssh/github_actions_key michael@tachyonfuture.com

# Check GitHub secret includes BEGIN/END lines
cat ~/.ssh/github_actions_key
```

### Tests Failing
```bash
# Run locally first
npm test
cd frontend && npm run lint
```

### Deployment Failed
```bash
# SSH to server and check logs
ssh michael@tachyonfuture.com
cd ~/moms-recipes
docker compose logs --tail 50
```

---

## That's It!

The setup is intentionally simple:
- **CI**: Run tests and builds
- **CD**: SSH to server and run your existing `deploy.sh`

No complex configuration needed!
