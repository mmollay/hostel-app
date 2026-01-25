#!/bin/bash
# Deploy to production environment (hostel-app)
set -e

echo "🚀 Deploying GastApp to PRODUCTION..."
echo "Branch: main"
echo "Target: gastauferden.at"
echo ""

# Ensure we're on main branch
git checkout main

# Merge develop into main
echo "📦 Merging develop into main..."
git merge develop --no-edit

# Build
npm run build

# Deploy to Cloudflare Pages (main branch = production)
npx wrangler pages deploy dist --project-name=hostel-app --branch=main

# Push changes
git push origin main

echo ""
echo "✅ Production deploy complete!"
echo "🔗 https://gastauferden.at"
