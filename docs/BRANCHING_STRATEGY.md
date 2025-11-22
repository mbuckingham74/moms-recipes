# Git Branching Strategy

## Overview

This document outlines the branching strategy for the Mom's Recipes project. It's designed to be simple, maintainable, and suitable for a single developer or small team working on features, bug fixes, and enhancements.

---

## Branch Structure

### Main Branches

#### `main`
- **Purpose:** Production-ready code
- **Protection:** Always stable and deployable
- **Deployment:** Automatically deploys to production (tachyonfuture.com)
- **Rules:**
  - Never commit directly to main
  - Only merge via pull requests
  - All commits must pass tests (when implemented)
  - Requires code review (even self-review for solo development)

#### `develop` (Optional)
- **Purpose:** Integration branch for features
- **Status:** Currently not in use (simple workflow)
- **When to add:** When you have multiple developers or need staging environment
- **For now:** Skip this and merge features directly to main after testing

---

## Working Branches

### Feature Branches

**Naming Convention:** `feature/description-of-feature`

**Examples:**
- `feature/react-frontend`
- `feature/recipe-import-tool`
- `feature/bulk-upload`
- `feature/advanced-search-ui`
- `feature/recipe-scaling`

**Workflow:**
```bash
# Create and switch to feature branch
git checkout -b feature/recipe-list-view

# Work on your feature, commit regularly
git add .
git commit -m "Add recipe card component"

# Keep branch updated with main (optional, do weekly or before PR)
git checkout main
git pull origin main
git checkout feature/recipe-list-view
git merge main

# Push to remote
git push -u origin feature/recipe-list-view

# Create pull request when ready
gh pr create --title "Add recipe list view" --body "..."

# After PR is merged, delete local branch
git checkout main
git pull origin main
git branch -d feature/recipe-list-view
```

**Best Practices:**
- One feature per branch
- Keep features small (< 1 week of work when possible)
- Commit frequently with descriptive messages
- Rebase or merge from main regularly to avoid conflicts
- Delete branch after merging to keep repo clean

---

### Bug Fix Branches

**Naming Convention:** `bugfix/description-of-bug`

**Examples:**
- `bugfix/ingredient-search-case-sensitivity`
- `bugfix/update-endpoint-camelcase`
- `bugfix/recipe-deletion-cascade`

**Workflow:**
```bash
# Create from main for production bugs
git checkout main
git checkout -b bugfix/search-returns-duplicates

# Fix the bug, write test if possible
git add .
git commit -m "Fix duplicate results in ingredient search"

# Push and create PR
git push -u origin bugfix/search-returns-duplicates
gh pr create --title "Fix duplicate search results" --body "..."
```

**Best Practices:**
- Branch from `main` (the broken code)
- Include issue number in branch name if using GitHub Issues: `bugfix/42-search-duplicates`
- Keep focused on single bug
- Add regression test if possible
- Merge quickly to fix production issues

---

### Hotfix Branches

**Naming Convention:** `hotfix/critical-issue`

**Examples:**
- `hotfix/database-connection-leak`
- `hotfix/cors-blocking-frontend`
- `hotfix/api-crash-on-null`

**When to Use:**
- Critical production bugs that need immediate fix
- Security vulnerabilities
- Data loss issues

**Workflow:**
```bash
# Create from main
git checkout main
git checkout -b hotfix/api-crash

# Fix immediately
git add .
git commit -m "Fix API crash when recipe has no ingredients"

# Push and merge immediately (skip normal review if critical)
git push -u origin hotfix/api-crash
gh pr create --title "HOTFIX: API crash on empty ingredients" --body "..."

# Merge to main immediately
# Deploy to production
# Delete branch
```

**Best Practices:**
- Only for critical issues
- Fast-track review process
- Notify team immediately
- Document what happened and why
- Follow up with proper fix if hotfix was rushed

---

### Experiment/Spike Branches

**Naming Convention:** `experiment/what-youre-testing`

**Examples:**
- `experiment/ocr-library-comparison`
- `experiment/elasticsearch-vs-sqlite`
- `experiment/pagination-strategies`

**When to Use:**
- Proof of concepts
- Testing new libraries
- Performance comparisons
- Architecture explorations

**Workflow:**
```bash
# Create from main
git checkout -b experiment/ocr-tesseract

# Experiment freely, commit often
git add .
git commit -m "Test Tesseract OCR accuracy on recipe images"

# Either:
# 1. Extract learnings and delete branch
# 2. Convert to feature branch if successful
# 3. Keep branch for future reference (don't merge)
```

**Best Practices:**
- Don't worry about code quality
- Document findings in comments or README
- Usually never merged to main
- Delete after extracting lessons learned
- Can live for weeks/months as reference

---

## Branch Naming Conventions

### Format
```
<type>/<short-description>
```

### Types
- `feature/` - New functionality
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `experiment/` - Experiments and spikes
- `refactor/` - Code improvements without feature changes
- `docs/` - Documentation only
- `test/` - Adding or updating tests
- `chore/` - Dependency updates, config changes

### Description Guidelines
- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise
- 2-5 words ideal
- Avoid generic names like `feature/updates` or `bugfix/fixes`

**Good Examples:**
```
feature/recipe-import-wizard
bugfix/ingredient-search-empty-results
refactor/database-query-optimization
docs/api-endpoint-examples
test/recipe-model-unit-tests
chore/update-express-version
```

**Bad Examples:**
```
feature/stuff
new-feature
bug
fix-things
johns-work
```

---

## Commit Message Guidelines

### Format
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

### Types (following Conventional Commits)
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change that neither fixes bug nor adds feature
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (deps, config)
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, no logic change)

### Examples
```bash
# Good commit messages
git commit -m "feat: add recipe import from CSV"
git commit -m "fix: prevent duplicate ingredients in search results"
git commit -m "refactor: simplify recipe model query methods"
git commit -m "docs: add API authentication examples"
git commit -m "test: add unit tests for recipe controller"
git commit -m "perf: add indexes to ingredients table"

# With body
git commit -m "feat: add multi-ingredient search

Allows users to search for recipes containing all specified
ingredients using AND logic. Uses efficient JOIN query with
indexed lookups.

Closes #23"
```

---

## Pull Request Workflow

### Creating a Pull Request

1. **Ensure branch is up to date**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git merge main  # or: git rebase main
   ```

2. **Push your branch**
   ```bash
   git push -u origin your-feature-branch
   ```

3. **Create PR with GitHub CLI**
   ```bash
   gh pr create --title "Add recipe list view" --body "$(cat <<'EOF'
   ## Summary
   - Implement recipe list view with grid layout
   - Add pagination controls
   - Include search bar integration

   ## Test plan
   - [ ] Load recipe list page
   - [ ] Verify pagination works
   - [ ] Test search functionality
   - [ ] Check mobile responsiveness

   ## Screenshots
   (if applicable)
   EOF
   )"
   ```

### PR Best Practices

**Title:**
- Clear and descriptive
- Use imperative mood: "Add feature" not "Added feature"
- Keep under 72 characters

**Description:**
- Summarize what changed
- Explain why (not what - code shows what)
- Link related issues
- Add screenshots for UI changes
- Include test plan/checklist

**Before Creating PR:**
- [ ] Code follows project style
- [ ] All tests pass (when implemented)
- [ ] No console.log() or debug code
- [ ] Updated relevant documentation
- [ ] Commits are clean and logical

**Review Process:**
- Review your own PR first (read the diff on GitHub)
- Check for accidental debug code or TODOs
- Verify CI passes (when implemented)
- For solo development: Wait 1 hour, then review with fresh eyes

---

## Keeping Branches Updated

### Strategy 1: Merge (Recommended for this project)
**When:** Regular features, multiple developers

```bash
git checkout feature/your-branch
git fetch origin
git merge origin/main
# Resolve conflicts if any
git push
```

**Pros:**
- Preserves complete history
- Shows when integration happened
- Safer for beginners
- Keeps branch history

**Cons:**
- Creates merge commits
- History can be cluttered

---

### Strategy 2: Rebase (Advanced)
**When:** Want clean linear history, solo developer

```bash
git checkout feature/your-branch
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git push --force-with-lease  # CAREFUL: Only for your branches
```

**Pros:**
- Clean linear history
- No merge commits
- Easier to read git log

**Cons:**
- Rewrites history (dangerous if shared)
- Conflicts harder to resolve
- Must force push

**⚠️ NEVER rebase `main` or shared branches!**

---

### When to Update Your Branch

**Update if:**
- Your branch is > 3 days old
- Main has significant changes
- About to create PR
- Conflicts likely

**Don't update if:**
- Just created branch today
- About to merge anyway
- No changes on main

---

## Branch Cleanup

### Local Cleanup

```bash
# List all branches
git branch -a

# Delete merged feature branch
git branch -d feature/old-feature

# Force delete unmerged branch (careful!)
git branch -D experiment/failed-test

# Delete all local branches that are merged
git branch --merged | grep -v "\*\|main" | xargs -n 1 git branch -d

# Prune deleted remote branches
git fetch --prune
```

### Remote Cleanup

```bash
# Delete remote branch
git push origin --delete feature/old-feature

# Or via GitHub CLI after PR merge
gh pr close 123 --delete-branch
```

### Automated Cleanup

Enable GitHub setting: "Automatically delete head branches" after PR merge

---

## Common Workflows

### Starting New Feature

```bash
# Get latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/recipe-sharing

# Start coding...
git add .
git commit -m "feat: add recipe share button"

# Push to remote (first time)
git push -u origin feature/recipe-sharing

# Continue working...
git add .
git commit -m "feat: implement share URL generation"
git push

# Ready for review
gh pr create
```

---

### Fixing a Bug

```bash
# Start from main
git checkout main
git pull origin main

# Create bugfix branch
git checkout -b bugfix/search-case-sensitive

# Fix and test
git add .
git commit -m "fix: make ingredient search case-insensitive"

# Push and create PR
git push -u origin bugfix/search-case-sensitive
gh pr create --title "Fix case-sensitive ingredient search"
```

---

### Working on Long-Running Feature

```bash
# Week 1: Start feature
git checkout -b feature/frontend-app
# Work, commit, push...

# Week 2: Update from main
git checkout main
git pull origin main
git checkout feature/frontend-app
git merge main
git push

# Week 3: Continue working
# Regular commits and pushes...

# Week 4: Ready for review
git checkout main
git pull origin main
git checkout feature/frontend-app
git merge main
git push
gh pr create
```

---

### Emergency Hotfix

```bash
# Someone reports production is broken!
git checkout main
git pull origin main
git checkout -b hotfix/api-500-error

# Fix quickly
git add .
git commit -m "hotfix: fix null pointer in recipe search"

# Fast-track to production
git push -u origin hotfix/api-500-error
gh pr create --title "HOTFIX: API 500 error on search"

# After review (or immediate if critical):
gh pr merge --squash
git checkout main
git pull origin main
git branch -d hotfix/api-500-error

# Verify fix in production
```

---

## Handling Merge Conflicts

### Prevention
- Keep branches short-lived
- Update from main regularly
- Communicate with team about which files you're working on
- Use smaller, focused branches

### Resolution

1. **Start merge/rebase**
   ```bash
   git merge main
   # or
   git rebase main
   ```

2. **Git shows conflicts**
   ```
   CONFLICT (content): Merge conflict in src/models/recipeModel.js
   ```

3. **Open conflicted file**
   ```javascript
   <<<<<<< HEAD
   // Your changes
   const results = db.prepare('SELECT * FROM recipes').all();
   =======
   // Changes from main
   const results = db.prepare('SELECT * FROM recipes WHERE active = 1').all();
   >>>>>>> main
   ```

4. **Resolve conflict**
   - Keep your changes, their changes, or combine both
   - Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Test the combined code

5. **Complete merge**
   ```bash
   git add src/models/recipeModel.js
   git commit  # For merge
   # or
   git rebase --continue  # For rebase
   ```

### Complex Conflicts
- If too complex, abort and ask for help
  ```bash
  git merge --abort
  # or
  git rebase --abort
  ```
- Consider pair programming for resolution
- Use a visual merge tool: `git mergetool`

---

## Tips and Best Practices

### General
- **Commit early, commit often** - Small commits are easier to review and revert
- **Push daily** - Backs up your work to remote
- **Pull before starting work** - Avoid conflicts
- **One logical change per commit** - Makes history readable
- **Write good commit messages** - Future you will thank present you

### Feature Branches
- Keep branches short-lived (< 1 week ideal)
- If branch gets too big, break into smaller features
- Delete branches after merging
- Don't branch from branches (usually)

### Code Review
- Review your own PRs first
- Keep PRs small (< 400 lines changed)
- Respond to review comments promptly
- Don't take feedback personally

### Avoiding Problems
- Never force push to `main`
- Don't commit secrets or API keys
- Don't commit `node_modules/` or `data/`
- Test before pushing
- Read error messages carefully

---

## Troubleshooting

### "I'm on the wrong branch!"

```bash
# Haven't committed yet? Switch branches (takes changes with you)
git checkout correct-branch

# Already committed? Move commit to correct branch
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1  # Careful!
```

---

### "I need to undo my last commit"

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes completely (CAREFUL!)
git reset --hard HEAD~1
```

---

### "I accidentally committed to main"

```bash
# Create feature branch from current position
git branch feature/my-changes

# Reset main to remote
git checkout main
git reset --hard origin/main

# Continue work on feature branch
git checkout feature/my-changes
```

---

### "My branch is way behind main"

```bash
# Option 1: Merge (safe)
git checkout your-branch
git merge main

# Option 2: Rebase (clean history, but rewrites commits)
git checkout your-branch
git rebase main
```

---

### "I want to temporarily save changes"

```bash
# Stash changes
git stash save "work in progress on feature X"

# Switch branches, do other work...

# Come back and restore
git stash pop
```

---

## Quick Reference

### Branch Commands

```bash
# List branches
git branch              # Local
git branch -a           # All (local + remote)
git branch -r           # Remote only

# Create and switch
git checkout -b feature/new-thing

# Switch branches
git checkout main

# Delete branch
git branch -d feature/merged-feature      # Safe delete (merged only)
git branch -D feature/abandoned-feature   # Force delete

# Rename branch
git branch -m old-name new-name

# Update from remote
git fetch --prune      # Update remote refs, remove deleted
git pull origin main   # Get latest main
```

---

### Status and History

```bash
# What's changed?
git status

# What's different?
git diff                    # Unstaged changes
git diff --staged           # Staged changes
git diff main..your-branch  # Compare branches

# History
git log --oneline           # Compact history
git log --graph --all       # Visual branch history
```

---

## Recommended Tools

### GitHub CLI (`gh`)
```bash
# Install: https://cli.github.com/

gh pr create              # Create PR
gh pr list               # List PRs
gh pr view 123           # View PR details
gh pr merge 123          # Merge PR
gh pr checkout 123       # Checkout PR locally
```

### Git Aliases

Add to `~/.gitconfig`:

```ini
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = log --graph --oneline --all
    cleanup = !git branch --merged | grep -v '\\*\\|main' | xargs -n 1 git branch -d
```

Usage:
```bash
git co main          # instead of: git checkout main
git br               # instead of: git branch
git visual           # pretty branch visualization
git cleanup          # delete all merged branches
```

---

## Summary

### For This Project

**Standard workflow:**
1. Always branch from updated `main`
2. Use descriptive branch names with prefixes
3. Commit frequently with good messages
4. Keep branches short-lived
5. Create PRs for all changes
6. Review before merging
7. Delete branches after merge
8. Keep `main` always deployable

**Branch naming:**
- `feature/` for new features
- `bugfix/` for bug fixes
- `hotfix/` for critical production fixes
- `docs/` for documentation

**When in doubt:**
- Commit and push often
- Ask before force pushing
- Test before creating PR
- Keep changes small and focused

---

*Last Updated: 2025-11-21*
*Project: Mom's Recipes*
*Maintainer: Michael Buckingham*
