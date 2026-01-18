#!/bin/bash
# Script to run Supabase migration using connection string
# Usage: ./run-migration.sh [PROJECT-REF] [DB-PASSWORD]

set -e

PROJECT_REF=${1:-"YOUR_PROJECT_REF"}
DB_PASSWORD=${2:-"Hi123123Hi\$\$123"}

if [ "$PROJECT_REF" = "YOUR_PROJECT_REF" ]; then
    echo "Error: Please provide your Supabase project reference"
    echo "Usage: ./run-migration.sh [PROJECT-REF] [DB-PASSWORD]"
    echo "Example: ./run-migration.sh abcdefghijklmnop supabase_password"
    exit 1
fi

CONNECTION_STRING="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

echo "Running migration on project: ${PROJECT_REF}"
echo "Migration file: migrations/01_initial_schema.sql"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    echo "On macOS: brew install postgresql"
    exit 1
fi

# Run the migration
psql "${CONNECTION_STRING}" -f migrations/01_initial_schema.sql

echo ""
echo "✅ Migration completed successfully!"
