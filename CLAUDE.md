# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                    # Run server locally

# Docker
docker compose up -d         # Start (creates .env on first run)
docker compose down          # Stop
docker compose up -d --build # Rebuild after changes

# Nginx
sudo ./deploy_nginx.sh       # Deploy config (reads HOST_PORT from .env)
sudo nginx -t && sudo systemctl reload nginx
```

## Architecture

Two parallel web applications sharing one Express server and admin authentication:

**General Link Page** (`/`, `/admin/*`)
- Simple link list with optional images
- Links stored in `links` table

**Pathologist Page** (`/pathologist`, `/pathologist/admin/*`)
- Categorized sections with links
- ICD-10 search integration
- PubMed feed (30-min server-side cache)
- Data in `path_links` and `path_sections` tables

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express app, all routes and business logic |
| `db.js` | SQLite initialization, schema, CRUD functions |
| `entrypoint.sh` | Docker entrypoint, generates .env with secure defaults |
| `deploy_nginx.sh` | Nginx deployment, substitutes HOST_PORT from data/.env |

### Database Schema (SQLite)

```sql
-- General app links
links (id, title, url, icon, image, sort_order, created_at)

-- Pathologist links
path_links (id, title, url, section, sort_order, created_at)

-- Pathologist sections/categories
path_sections (id, key, label, icon, has_icd_search, sort_order)
```

### Environment Variables

Auto-generated in `data/.env` on first Docker start:
- `PORT` / `HOST_PORT` - Container/host ports (3000/3100)
- `ADMIN_PASSWORD` - Format: `ChangeMe` + 12 hex chars
- `SESSION_SECRET` - 64-char random hex

## External Integrations

- **PubMed API** (NCBI eUtils) - `getPubmedFeed()` in server.js, fetches from "Am J Surg Pathol" journal
- **ICD10data.com** - Client-side links for ICD-10 code lookup
