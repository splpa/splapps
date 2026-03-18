#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="/etc/nginx"
ENV_FILE="${SCRIPT_DIR}/.env"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./deploy_nginx.sh)"
    exit 1
fi

# Read HOST_PORT from .env file (default: 3100)
HOST_PORT=3100
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    HOST_PORT="${HOST_PORT:-3100}"
fi

echo "Deploying nginx configuration for SPLAPPS..."
echo "Using HOST_PORT: ${HOST_PORT}"

# Copy main config to sites-available with port substitution
echo "Copying splapps.conf to ${NGINX_DIR}/sites-available/"
sed "s/127\.0\.0\.1:[0-9]*/127.0.0.1:${HOST_PORT}/g" \
    "${SCRIPT_DIR}/nginx/splapps.conf" > "${NGINX_DIR}/sites-available/splapps.conf"

# Create symlink in sites-enabled if it doesn't exist
if [ ! -L "${NGINX_DIR}/sites-enabled/splapps.conf" ]; then
    echo "Creating symlink in ${NGINX_DIR}/sites-enabled/"
    ln -s "${NGINX_DIR}/sites-available/splapps.conf" "${NGINX_DIR}/sites-enabled/splapps.conf"
else
    echo "Symlink already exists in ${NGINX_DIR}/sites-enabled/"
fi

# Copy snippets
echo "Copying snippets to ${NGINX_DIR}/snippets/"
mkdir -p "${NGINX_DIR}/snippets"
cp "${SCRIPT_DIR}/nginx/snippets/"*.conf "${NGINX_DIR}/snippets/"

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Test nginx configuration:"
echo "     sudo nginx -t"
echo ""
echo "  2. If test passes, reload nginx:"
echo "     sudo systemctl reload nginx"
echo ""
