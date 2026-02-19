#!/usr/bin/env bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE auth_db;
  CREATE DATABASE user_db;
  CREATE DATABASE blog_db;pnpm db:clean
  CREATE DATABASE comment_db;
EOSQL
