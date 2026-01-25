#!/bin/bash
# Deploy to develop environment (hostel-app)
set -e

echo "🚀 Deploying GastApp to DEVELOP..."
echo "Branch: develop"
echo "Target: develop.gastauferden.at"
echo ""

# Ensure we're on develop branch
git checkout develop

# Build
npm run build

# Deploy to Cloudflare Pages (develop branch)
npx wrangler pages deploy dist --project-name=hostel-app --branch=develop

echo ""
echo "✅ Deploy complete!"
echo "🔗 https://develop.gastauferden.at"
