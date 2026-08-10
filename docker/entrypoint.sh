#!/bin/sh
set -e

grant_backup_access() {
  backup_dir="${BACKUP_DIR:-/mnt/atrio-backups}"

  [ -d "$backup_dir" ] || return 0

  # Avoid changing the user's groups when the directory is already accessible.
  if gosu app sh -c 'test -r "$1" && test -x "$1"' sh "$backup_dir"; then
    return 0
  fi

  backup_gid="${BACKUP_GID:-$(stat -c '%g' "$backup_dir" 2>/dev/null || true)}"
  case "$backup_gid" in
    ""|*[!0-9]*)
      echo "[entrypoint] BACKUP_GID invalido: $backup_gid" >&2
      return 0
      ;;
  esac

  # Never grant the application membership of the root group implicitly.
  if [ "$backup_gid" = "0" ]; then
    echo "[entrypoint] $backup_dir nao e legivel por app e pertence ao grupo root; ajuste as permissoes ou defina BACKUP_GID" >&2
    return 0
  fi

  backup_group="$(getent group "$backup_gid" | cut -d: -f1)"
  if [ -z "$backup_group" ]; then
    backup_group="backup-access-$backup_gid"
    if getent group "$backup_group" >/dev/null 2>&1; then
      echo "[entrypoint] o grupo $backup_group ja existe com outro GID" >&2
      return 0
    fi
    addgroup --system --gid "$backup_gid" "$backup_group" >/dev/null
  fi

  if ! id -G app | tr ' ' '\n' | grep -qx "$backup_gid"; then
    adduser app "$backup_group" >/dev/null
  fi
}

# Ensure writable volumes when running as root, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data /app/staticfiles
  chown -R app:app /data /app/staticfiles
  grant_backup_access
  exec gosu app "$@"
fi

exec "$@"
