#!/usr/bin/bash

echo "Enter live url now: "
read -rs LIVE_URL    # paste when prompted

echo "Dumping live DB"
docker run --rm -v "$PWD:/backup" postgres:18.3-alpine \
  pg_dump "$LIVE_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file=/backup/live.dump

echo "Waiting for container to be ready"
docker compose up -d
# wait for healthcheck
until docker compose exec -T postgres pg_isready -U postgres -d doxalife; do sleep 1; done

echo "Copying database into postgres"
docker compose cp live.dump postgres:/tmp/live.dump
docker compose exec -T postgres pg_restore \
  -U postgres -d doxalife \
  --clean --if-exists --no-owner --no-privileges \
  /tmp/live.dump
