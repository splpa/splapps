#!/bin/bash

# --- CONFIGURATION ---
DOMAIN="apps.pa-tools.work"
EMAIL="your-email@example.com"
INI_PATH="/etc/letsencrypt/cloudflare.ini"

# 1. Ensure the script is run as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Error: This script must be run as root (use sudo)"
   exit 1
fi

# 2. Check for the Credentials File
if [ ! -f "$INI_PATH" ]; then
    echo "--------------------------------------------------------"
    echo "🔑 Cloudflare API Token Not Found!"
    echo "--------------------------------------------------------"
    echo "To get a token:"
    echo "1. Log into Cloudflare -> My Profile -> API Tokens."
    echo "2. Click 'Create Token' -> Use 'Edit zone DNS' template."
    echo "3. Select your zone (pa-tools.work) and click 'Continue'."
    echo ""
    echo -n "Please paste your API Token here and press [ENTER]: "
    read -s CF_TOKEN
    echo ""

    # Create the directory if it doesn't exist
    mkdir -p "$(dirname "$INI_PATH")"

    # Write the file
    echo "dns_cloudflare_api_token = $CF_TOKEN" > "$INI_PATH"
    
    # Secure the file (CRITICAL: Certbot will fail if this is public)
    chmod 600 "$INI_PATH"
    echo "✅ Credentials secured at $INI_PATH"
else
    echo "✅ Using existing credentials at $INI_PATH"
fi

# 3. Install Dependencies
echo "📦 Ensuring Certbot & Cloudflare plugin are installed..."
apt update && apt install -y certbot python3-certbot-dns-cloudflare

# 4. Request the Certificate
echo "🌐 Requesting certificate for $DOMAIN..."
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials "$INI_PATH" \
  --dns-cloudflare-propagation-seconds 60 \
  --agree-tos \
  -m "$EMAIL" \
  --no-eff-email \
  -d "$DOMAIN" \
  --deploy-hook "systemctl reload nginx"

echo "--------------------------------------------------------"
echo "🎉 Setup Complete!"
echo "Certificate Path: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "Private Key Path: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "--------------------------------------------------------"
