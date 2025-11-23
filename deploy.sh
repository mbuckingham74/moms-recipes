#!/bin/bash
# Deployment script for Mom's Recipes on tachyonfuture.com
# Run this script on your SERVER after cloning the repo

set -e  # Exit on error

echo "🚀 Deploying Mom's Recipes..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.docker.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your MySQL password!"
    echo "   Run: nano .env"
    echo "   Then run this script again."
    exit 1
fi

# Check if DB_PASSWORD is set
if ! grep -q "DB_PASSWORD=.\+" .env; then
    echo "❌ DB_PASSWORD not set in .env file!"
    echo "📝 Please edit .env and add your MySQL password"
    echo "   Run: nano .env"
    exit 1
fi

echo "✅ Environment configured"

# Check if networks exist
echo "🔍 Checking Docker networks..."

if ! docker network inspect npm_network >/dev/null 2>&1; then
    echo "❌ npm_network not found - creating it..."
    docker network create npm_network
else
    echo "✅ npm_network exists"
fi

if ! docker network inspect meteo-internal >/dev/null 2>&1; then
    echo "❌ meteo-internal not found - creating it..."
    docker network create meteo-internal
else
    echo "✅ meteo-internal exists"
fi

# Check if MySQL container exists
echo "🔍 Checking MySQL container..."
if ! docker ps | grep -q meteo-mysql-prod; then
    echo "⚠️  WARNING: meteo-mysql-prod container not running!"
    echo "   This app requires the MySQL container to be running."
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MySQL container running"
fi

# Build and start containers
echo "🏗️  Building containers..."
docker compose build

echo "🚀 Starting containers..."
docker compose up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container Status:"
docker compose ps

# Check logs for errors
echo ""
echo "📋 Recent Backend Logs:"
docker compose logs --tail=20 moms-recipes-backend

echo ""
echo "📋 Recent Frontend Logs:"
docker compose logs --tail=20 moms-recipes-frontend

# Final checks
echo ""
echo "🔍 Running health checks..."

# Backend health check
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    echo "   Check logs: docker logs moms-recipes-backend"
fi

# Check if containers are running
if docker ps | grep -q moms-recipes-backend && docker ps | grep -q moms-recipes-frontend; then
    echo "✅ All containers running"
else
    echo "❌ Some containers not running - check docker compose ps"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure Nginx Proxy Manager:"
echo "      - Frontend: moms-recipes.tachyonfuture.com → moms-recipes-frontend:80"
echo "      - Backend: api.moms-recipes.tachyonfuture.com → moms-recipes-backend:3001"
echo ""
echo "   2. Test the deployment:"
echo "      - Backend: curl http://localhost:3001/health"
echo "      - After NPM: https://moms-recipes.tachyonfuture.com"
echo ""
echo "   3. Monitor logs:"
echo "      - docker compose logs -f"
echo ""
echo "📖 See docs/DOCKER_DEPLOYMENT.md for detailed instructions"
