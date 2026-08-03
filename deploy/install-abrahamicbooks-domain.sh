#!/usr/bin/env bash
set -euo pipefail

if (( EUID != 0 )); then
  echo "Run this installer as root." >&2
  exit 1
fi

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_config="$script_directory/nginx/abrahamicbooks.org.conf"
available_config=/etc/nginx/sites-available/abrahamicbooks.org
enabled_config=/etc/nginx/sites-enabled/abrahamicbooks.org
backup_directory="/root/abrahamicbooks-domain-backup-$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$backup_directory"
cp -a /etc/nginx/nginx.conf "$backup_directory/nginx.conf"
cp -a /etc/nginx/sites-available "$backup_directory/sites-available"
cp -a /etc/nginx/sites-enabled "$backup_directory/sites-enabled"

install -m 0644 "$source_config" "$available_config"
if [[ -e "$enabled_config" && "$(readlink -f "$enabled_config")" != "$available_config" ]]; then
  echo "A different enabled configuration already uses this filename; nothing was reloaded." >&2
  exit 1
fi
if [[ ! -e "$enabled_config" ]]; then
  ln -s "$available_config" "$enabled_config"
fi

nginx -t
systemctl reload nginx

cp -a "$available_config" "$backup_directory/abrahamicbooks.org.pre-certbot"
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect \
  -d abrahamicbooks.org \
  -d www.abrahamicbooks.org

nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer

echo "Domain configuration and HTTPS certificate installed successfully."
echo "Backups: $backup_directory"
