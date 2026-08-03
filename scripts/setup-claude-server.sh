#!/bin/bash
# ============================================================
# School OS — Claude Code Server Setup Script
# Run this on the VPS (5.78.222.166) as the school-os user
# ============================================================
set -e

echo "=============================================="
echo " School OS — Claude Code Server Setup"
echo "=============================================="

# 1. Check we're in the right directory
if [ ! -f package.json ]; then
  echo "ERROR: Run this from /home/kevinschoolos"
  exit 1
fi

# 2. Install Claude Code CLI (if not already installed)
if ! command -v claude &> /dev/null; then
  echo "📦 Installing Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code
else
  echo "✅ Claude Code already installed: $(claude --version)"
fi

# 3. Ensure .claude directory exists with proper settings
echo "📁 Setting up .claude/settings.json..."
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "allowRead": [
    "/home/kevinschoolos"
  ],
  "allowWrite": [
    "/home/kevinschoolos"
  ],
  "allowExecute": [
    "npm",
    "npx",
    "node",
    "git",
    "next",
    "curl"
  ]
}
EOF
echo "✅ .claude/settings.json configured"

# 4. Ensure CLAUDE.md is the authoritative version
echo "📄 Checking CLAUDE.md..."
if [ -f CLAUDE.md ]; then
  SIZE=$(wc -c < CLAUDE.md)
  echo "   Current CLAUDE.md size: ${SIZE} bytes"
  if [ "$SIZE" -lt 5000 ]; then
    echo "   ⚠️  CLAUDE.md is too small (bootstrap placeholder)."
    echo "   Please pull the latest from git: git pull origin main"
    echo "   The authoritative CLAUDE.md has full frontend instructions (Section 8)."
  else
    echo "   ✅ CLAUDE.md looks complete"
  fi
else
  echo "   ⚠️  CLAUDE.md not found. Pull from git: git pull origin main"
fi

# 5. Seed test users (if not already seeded)
echo "🔑 Checking database users..."
USER_COUNT=$(npx tsx -e "
import dotenv from 'dotenv';
dotenv.config();
import prisma from './lib/prisma';
const count = await prisma.user.count();
console.log(count);
await prisma.\$disconnect();
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -gt 0 ]; then
  echo "   ✅ Found ${USER_COUNT} users in database"
  echo "   Seeding passwords..."
  npx tsx scripts/seed-passwords.ts
else
  echo "   ⚠️  No users found. Run sync first, then seed passwords."
  echo "   npx tsx scripts/seed-passwords.ts"
fi

# 6. Verify frontend is running
echo "🌐 Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8002/login 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "   ✅ Frontend is running at http://127.0.0.1:8002/login"
else
  echo "   ⚠️  Frontend not running (status: ${FRONTEND_STATUS})"
  echo "   Start it with: npm run dev"
  echo "   Or check the systemd service: systemctl status school-os-dashboard.service"
fi

# 7. Verify public URL
echo "🌐 Checking public URL..."
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://crm.navstar-education.com/login 2>/dev/null || echo "000")
if [ "$PUBLIC_STATUS" = "200" ]; then
  echo "   ✅ Public URL accessible: https://crm.navstar-education.com/login"
else
  echo "   ⚠️  Public URL not accessible (status: ${PUBLIC_STATUS})"
fi

echo ""
echo "=============================================="
echo " Setup complete!"
echo ""
echo " To use Claude Code on this server:"
echo "   cd /home/kevinschoolos"
echo "   claude"
echo ""
echo " Test credentials:"
echo "   Email: ownerdirector@gmail.com"
echo "   Password: Pass@123"
echo ""
echo " Frontend URL:"
echo "   https://crm.navstar-education.com/login"
echo "   (fallback: https://5.78.222.166/login)"
echo "=============================================="