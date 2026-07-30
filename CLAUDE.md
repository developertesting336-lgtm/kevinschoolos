# School OS — Claude Code Setup (VPS)

This file configures Claude Code CLI for the School OS project on the VPS.

## What This Setup Does

Kevin can SSH into the VPS and use Claude Code CLI to:
- Read and analyze the School OS frontend code
- Ask questions about the codebase
- Get AI-powered code suggestions
- Write/modify code directly on the server

## For Kevin — How to Use

### Step 1: SSH into VPS
```bash
claude ssh root@5.78.222.166
```

### Step 2: Navigate to frontend code
```bash
cd /home/kevinschoolos
```

### Step 3: Set your Anthropic API key
```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxx"
```

### Step 4: Start Claude Code
```bash
claude
```

### Step 5: Ask questions like
- "Review the admissions pipeline component"
- "Find performance issues in the dashboard"
- "Explain how the sidebar navigation works"
- "Show me the RBAC implementation"
- "Add a new feature to the dashboard"

## Claude Code Permissions

- ✅ Read all project files
- ✅ Write/modify project files
- ✅ Execute npm/node/next commands
- ❌ System files outside project

## Project Structure on VPS

```
/home/kevinschoolos/
├── app/              # Next.js pages & API routes
├── components/       # React components
├── config/           # Field map & RBAC config
├── lib/              # Core libraries (Airtable, auth, RBAC)
├── prisma/           # Database schema & migrations
├── public/           # Static files
├── scripts/          # Utility scripts
├── .claude/          # Claude Code settings
└── CLAUDE.md         # This file