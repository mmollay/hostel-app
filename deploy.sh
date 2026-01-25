#!/bin/bash
# Quick deploy to Cloudflare Pages via Wrangler
export CLOUDFLARE_API_KEY=$(cat /root/claudeflare_key)
export CLOUDFLARE_EMAIL="office@ssi.at"
cd /home/clawdbot/clawd/projects/gast-app
wrangler pages deploy ./dashboard --project-name=hostel-app --commit-dirty=true
