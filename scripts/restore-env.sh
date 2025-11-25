#!/bin/bash
# Restore production .env from template
# Run this on the server: ~/moms-recipes/restore-env.sh

set -e

echo "🔧 Restoring production .env file..."

cd ~/moms-recipes

# Check if template exists
if [ ! -f .env.production.template ]; then
    echo "❌ ERROR: .env.production.template not found!"
    exit 1
fi

# Make .env writable if it's read-only
chmod 644 .env 2>/dev/null || true

# Copy template to .env
cp .env.production.template .env

echo "✅ .env restored from template"
echo "📊 File size: $(wc -l < .env) lines"
echo ""
echo "Environment variables:"
grep "^[A-Z]" .env | cut -d= -f1 | sed 's/^/  ✓ /'

echo ""
echo "🔄 Restart containers to apply: docker compose restart"
