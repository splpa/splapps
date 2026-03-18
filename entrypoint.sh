#!/bin/sh

ENV_FILE="/app/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Generating .env file with secure defaults..."

  # Generate 64-character random hex string for SESSION_SECRET
  SESSION_SECRET=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1)

  # Generate 12-character random hex string for ADMIN_PASSWORD suffix
  RANDOM_SUFFIX=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 12 | head -n 1)

  cat > "$ENV_FILE" << EOF
# SPLAPPS Environment Configuration
# Generated automatically on first run

# Application port (internal container port)
PORT=3000

# Host port for Docker (external port mapping)
HOST_PORT=3100

# Admin password
ADMIN_PASSWORD=ChangeMe${RANDOM_SUFFIX}

# Session secret (do not change after first run)
SESSION_SECRET=${SESSION_SECRET}
EOF

  echo ".env file created successfully"
fi

# Export variables from .env file for the application
set -a
. "$ENV_FILE"
set +a

# Execute the main command
exec "$@"
