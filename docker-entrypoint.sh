#!/bin/sh
set -eu

socket_path="${DOCKER_SOCKET:-/var/run/docker.sock}"

if [ "$(id -u)" = "0" ] && [ -S "$socket_path" ]; then
  socket_gid="$(stat -c '%g' "$socket_path")"
  socket_group="$(getent group "$socket_gid" | cut -d: -f1 || true)"
  if [ -z "$socket_group" ]; then
    socket_group="docker-host"
    groupadd --gid "$socket_gid" "$socket_group"
  fi
  usermod --append --groups "$socket_group" bun
  exec runuser --user bun -- "$@"
fi

exec "$@"
