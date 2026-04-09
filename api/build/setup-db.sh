#!/usr/bin/env bash
# =============================================================================
# ImpuMate — setup-db.sh
# Sets up the PostgreSQL database: creates it, applies schema, seeds fiscal data.
#
# Usage:
#   ./setup-db.sh [OPTIONS]
#
# Options:
#   --reset     Drop and recreate the database before applying the schema.
#               WARNING: destroys all existing data.
#   --no-seed   Skip seeding fiscal parameters after applying the schema.
#   --help      Show this message.
#
# Configuration (env vars or .env file in /api):
#   DB_NAME     Database name          (default: impumate_dev)
#   DB_USER     PostgreSQL user        (default: current OS user)
#   DB_HOST     PostgreSQL host        (default: localhost)
#   DB_PORT     PostgreSQL port        (default: 5432)
#
# Example:
#   DB_NAME=impumate_test ./setup-db.sh --reset --no-seed
# =============================================================================

set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$(cd "$API_DIR/../integrated-algorithms/db" && pwd)"
SCHEMA_FILE="$DB_DIR/schema.sql"
SEED_FILE="$DB_DIR/seed_fiscal_parameters.sql"
ENV_FILE="$API_DIR/.env"

# ── Load .env if present ──────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  echo "  Loading $ENV_FILE"
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

# ── Config (env vars take precedence) ────────────────────────────────────────
DB_NAME="${DB_NAME:-impumate_dev}"
DB_USER="${DB_USER:-$(whoami)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
export PGPASSWORD="${DB_PASSWORD:-}"

# ── Parse flags ───────────────────────────────────────────────────────────────
RESET=false
SEED=true

for arg in "$@"; do
  case "$arg" in
    --reset)   RESET=true ;;
    --no-seed) SEED=false ;;
    --help)
      sed -n '2,25p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg. Use --help for usage."
      exit 1
      ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER"

run_sql() {
  $PSQL -d "$DB_NAME" -f "$1"
}

run_sql_on_postgres() {
  $PSQL -d postgres -c "$1"
}

db_exists() {
  $PSQL -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" \
    | grep -q 1
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         ImpuMate — Database Setup                ║"
echo "╚══════════════════════════════════════════════════╝"
echo "  DB_NAME : $DB_NAME"
echo "  DB_USER : $DB_USER"
echo "  DB_HOST : $DB_HOST:$DB_PORT"
echo "  Reset   : $RESET"
echo "  Seed    : $SEED"
echo ""

# ── Check files exist ─────────────────────────────────────────────────────────
if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "ERROR: Schema file not found: $SCHEMA_FILE"
  exit 1
fi

if [[ "$SEED" == true && ! -f "$SEED_FILE" ]]; then
  echo "ERROR: Seed file not found: $SEED_FILE"
  exit 1
fi

# ── Check postgres is reachable ───────────────────────────────────────────────
echo ">>> Checking PostgreSQL connection..."
if ! $PSQL -d postgres -c "\q" 2>/dev/null; then
  echo ""
  echo "ERROR: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT as user '$DB_USER'."
  echo "Make sure PostgreSQL is running and the user exists."
  echo ""
  echo "Quick start with Docker:"
  echo "  docker run -d --name impumate-pg \\"
  echo "    -e POSTGRES_USER=$DB_USER \\"
  echo "    -e POSTGRES_DB=$DB_NAME \\"
  echo "    -p 5432:5432 postgres:15"
  exit 1
fi
echo "    Connection OK."
echo ""

# ── Reset: drop database ──────────────────────────────────────────────────────
if [[ "$RESET" == true ]]; then
  if db_exists; then
    echo ">>> Dropping database '$DB_NAME'..."
    run_sql_on_postgres "DROP DATABASE \"$DB_NAME\";"
    echo "    Dropped."
  else
    echo ">>> Database '$DB_NAME' does not exist — nothing to drop."
  fi
  echo ""
fi

# ── Create database if not exists ─────────────────────────────────────────────
if db_exists; then
  echo ">>> Database '$DB_NAME' already exists — skipping creation."
else
  echo ">>> Creating database '$DB_NAME'..."
  run_sql_on_postgres "CREATE DATABASE \"$DB_NAME\";"
  echo "    Created."
fi
echo ""

# ── Apply schema ──────────────────────────────────────────────────────────────
echo ">>> Applying schema: $SCHEMA_FILE"
run_sql "$SCHEMA_FILE"
echo "    Schema applied."
echo ""

# ── Seed fiscal parameters ────────────────────────────────────────────────────
if [[ "$SEED" == true ]]; then
  echo ">>> Seeding fiscal parameters (2026): $SEED_FILE"
  run_sql "$SEED_FILE"
  echo "    Seed complete."
  echo ""
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════╗"
echo "║   Database setup complete.                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Connect:  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
