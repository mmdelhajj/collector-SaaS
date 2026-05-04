# ISP & Utility Collection SaaS Platform

A multi-tenant SaaS platform for ISPs, electricity providers, satellite TV, and other utility services — with a powerful field collector module for door-to-door cash collection.

## Quick Start

### 1. Install Claude Code (one time)
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Open this folder in your terminal
```bash
cd isp-saas-platform
```

### 3. Initialize git
```bash
git init
git add .
git commit -m "chore: initial project documentation"
```

### 4. Start Claude Code for the BACKEND + WEB ADMIN
From the project root:
```bash
claude
```
Then in the Claude Code chat, type:
```
begin
```
Claude Code will read `CLAUDE.md`, `STATUS.md`, and `docs/project-plan.md` automatically and start building Phase 1 Task 1 (initialize Laravel, Docker, Postgres, Redis, etc.).

### 5. Start Claude Code for the MOBILE APP (later, after backend has APIs)
Open a **new terminal window**:
```bash
cd isp-saas-platform/mobile-collector
claude
```
Then type:
```
begin
```
This separate session will use the mobile-specific `CLAUDE.md` inside that folder.

## Project Structure

```
isp-saas-platform/
├── CLAUDE.md              ← Backend + web instructions (auto-read by Claude Code)
├── STATUS.md              ← Live progress tracker (update every session)
├── README.md              ← This file
├── docs/
│   └── project-plan.md    ← Full strategic plan, market analysis, roadmap
├── backend/               ← Laravel API (created by Claude Code)
├── web-admin/             ← Next.js admin panel (created by Claude Code)
└── mobile-collector/
    └── CLAUDE.md          ← Mobile app instructions (separate session)
```

## What Gets Built (Phase 1 — MVP)

- Multi-tenant Laravel backend (PostgreSQL + Redis + Docker)
- Customer, package, subscription, invoice, payment management
- Auto-receipt flow (WhatsApp + SMS when collector marks paid)
- Next.js admin panel with Arabic/English/French support
- Flutter collector mobile app with offline mode
- RADIUS integration for ISP auto-suspend/reactivate

## Tech Stack

- **Backend:** Laravel 11, PostgreSQL, Redis, Sanctum, stancl/tenancy
- **Web:** Next.js 15, TypeScript, TailwindCSS, shadcn/ui
- **Mobile:** Flutter 3.x, Riverpod, Drift (SQLite), Dio
- **Infra:** Docker, Hetzner/AWS, Nginx, Cloudflare R2

See `CLAUDE.md` for full details.

## Important Files for Claude Code

| File | When it's read |
|---|---|
| `CLAUDE.md` (root) | Every backend/web Claude Code session |
| `mobile-collector/CLAUDE.md` | Every mobile Claude Code session |
| `STATUS.md` | Every session — keeps Claude Code up-to-date |
| `docs/project-plan.md` | Referenced when needed |

**Always update `STATUS.md` at the end of each coding session** so the next session has full context.

## Workflow Tips

- **Commit before every Claude Code session.** `git reset --hard` is your undo button.
- **Work in small increments.** Say "do task 1" not "build everything."
- **Review every diff** before approving — especially migrations and security code.
- **Run tests after every feature.** Claude Code is instructed to do this, but verify.
- **For long sessions**, ask Claude Code to update `STATUS.md` before stopping.

## License

Proprietary — All rights reserved.
