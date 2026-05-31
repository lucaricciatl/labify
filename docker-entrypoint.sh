#!/bin/sh
set -e

# Substitute LISTEN env var into nginx config (default 0.0.0.0)
LISTEN=${LISTEN:-0.0.0.0}
sed -i "s/%%LISTEN%%/${LISTEN}/g" /etc/nginx/conf.d/default.conf

exec "$@"
