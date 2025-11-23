#!/bin/bash
# Safe deployment script for Mom's Recipes
# This script ensures .env is preserved during deployment

set -e  # Exit on error

echo "🚀 Mom's Recipes - Safe Deployment Script"
echo "=========================================="

# Navigate to project directory
cd ~/moms-recipes

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please create .env file with required variables before deploying."
    echo "See DEPLOYMENT.md for required variables."
    exit 1
fi

echo "✅ .env file found"

# Backup .env (just in case)
cp .env .env.backup
echo "✅ .env backed up to .env.backup"

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull

# Verify .env still exists
if [ ! -f .env ]; then
    echo "⚠️  .env was removed by git pull! Restoring from backup..."
    cp .env.backup .env
fi

echo "✅ .env intact"

# Rebuild and restart containers
echo "🐳 Rebuilding and restarting Docker containers..."
docker compose up -d --build

# Wait for containers to start
echo "⏳ Waiting for containers to be healthy..."
sleep 10

# Check container status
echo ""
echo "📊 Container Status:"
docker ps --filter name=moms-recipes --format 'table {{.Names}}\t{{.Status}}'

# Verify environment variables are loaded
echo ""
echo "🔍 Verifying environment variables..."
if docker exec moms-recipes-backend printenv ANTHROPIC_API_KEY > /dev/null 2>&1; then
    echo "✅ ANTHROPIC_API_KEY is set"
else
    echo "❌ ANTHROPIC_API_KEY is NOT set"
fi

if docker exec moms-recipes-backend printenv JWT_SECRET > /dev/null 2>&1; then
    echo "✅ JWT_SECRET is set"
else
    echo "❌ JWT_SECRET is NOT set"
fi

# Show recent logs
echo ""
echo "📝 Recent backend logs:"
docker logs moms-recipes-backend --tail 10

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Application URLs:"
echo "  - Frontend: https://moms-recipes.tachyonfuture.com"
echo "  - API: https://api.moms-recipes.tachyonfuture.com"
echo ""
echo "To view logs: docker logs moms-recipes-backend -f"
