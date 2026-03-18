# SPLAPPS

A self-hosted link landing page application with specialized features for medical professionals.

## Features

- **General Link Page** (`/`) - Customizable link landing page with image support
- **Pathologist Landing Page** (`/pathologist`) - Specialized page with:
  - Categorized link sections
  - ICD-10 code search integration
  - Live PubMed feed (American Journal of Surgical Pathology)
- **Admin Panels** - Web-based management for both pages
- **Docker Deployment** - Containerized with auto-generated secure credentials
- **Nginx Ready** - Includes reverse proxy configuration with SSL support

## Quick Start

```bash
# Clone and start
git clone <repository-url>
cd splapps
docker compose up -d
```

On first run, a `.env` file is automatically created with secure random credentials.

Access the application at `http://localhost:3100`

## Configuration

Configuration is stored in `.env` (auto-generated on first start):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Internal container port | `3000` |
| `HOST_PORT` | External Docker port | `3100` |
| `ADMIN_PASSWORD` | Admin login password | `ChangeMe` + random suffix |
| `SESSION_SECRET` | Session encryption key | 64-char random hex |

### Changing Ports

After modifying `HOST_PORT` in `.env`:

```bash
docker compose down && docker compose up -d
sudo ./deploy_nginx.sh
sudo nginx -t && sudo systemctl reload nginx
```

## Usage

### General Link Page

- **Public page**: `http://localhost:3100/`
- **Admin login**: `http://localhost:3100/admin/login`
- **Admin panel**: `http://localhost:3100/admin`

Features:
- Add/edit/delete links
- Upload images (jpg, png, gif, svg, webp, ico - max 5MB)
- Set FontAwesome icons or emoji
- Custom sort ordering

### Pathologist Landing Page

- **Public page**: `http://localhost:3100/pathologist`
- **Admin login**: `http://localhost:3100/pathologist/admin/login`
- **Admin panel**: `http://localhost:3100/pathologist/admin`

Features:
- Manage link sections (categories)
- ICD-10 search integration per section
- Footer news links (CAP, AJSP)
- Automatic PubMed feed

## Nginx Deployment

For production deployment behind nginx with SSL:

```bash
# Deploy nginx configuration (reads port from .env)
sudo ./deploy_nginx.sh

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

This installs:
- `/etc/nginx/sites-available/splapps.conf` - Main server config
- `/etc/nginx/snippets/splapps-ssl.conf` - SSL/TLS settings
- `/etc/nginx/snippets/splapps-proxy.conf` - Proxy headers

The config expects SSL certificates at `/etc/letsencrypt/live/pa-tools.work/`.

## Docker Commands

```bash
docker compose up -d         # Start application
docker compose down          # Stop application
docker compose logs -f       # View logs
docker compose up -d --build # Rebuild after code changes
```

## Data Persistence

Data is stored in mounted volumes:
- `./data/` - SQLite database
- `./public/uploads/` - Uploaded images
- `./.env` - Environment configuration

## Tech Stack

- Node.js 20 (Alpine)
- Express.js
- EJS templating
- SQLite3 (better-sqlite3 with WAL mode)
- Multer (file uploads)
- Docker

## License

MIT
