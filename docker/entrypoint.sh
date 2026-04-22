#!/bin/sh
set -e
if [ "$(id -u)" = 0 ]; then
  mkdir -p /data
  chown -R nextjs:nodejs /data 2>/dev/null || true
  exec gosu nextjs "$0" "$@"
fi
exec sh -c "npx prisma migrate deploy && exec npx next start -H 0.0.0.0 -p ${PORT:-3000}"
