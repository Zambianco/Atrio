#!/bin/sh
set -e

# Ensure writable volumes when running as root, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data /app/staticfiles
  chown -R app:app /data /app/staticfiles
  exec gosu app "$@"
fi

exec "$@"
