#!/bin/bash

# Database Setup Script for Onboarding Tracker
# This script helps automate the PostgreSQL setup process

echo "╔════════════════════════════════════════════════╗"
echo "║   Onboarding Tracker - Database Setup         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo "Please install PostgreSQL first:"
    echo "  - Mac: brew install postgresql@15"
    echo "  - Linux: sudo apt install postgresql"
    echo "  - Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Get database credentials
echo "Please enter your PostgreSQL credentials:"
read -p "Database User (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Database Password: " DB_PASSWORD
echo ""

read -p "Database Name (default: onboarding_tracker): " DB_NAME
DB_NAME=${DB_NAME:-onboarding_tracker}

read -p "Database Host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database Port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "API Server Port (default: 3001): " API_PORT
API_PORT=${API_PORT:-3001}

echo ""
echo "📝 Configuration:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  API Port: $API_PORT"
echo ""

# Check if database exists
echo "🔍 Checking if database exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "📦 Creating database: $DB_NAME"
    PGPASSWORD=$DB_PASSWORD createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
else
    echo "✅ Database already exists"
fi

echo ""

# Run schema
echo "📊 Setting up database schema..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f server/db/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully"
else
    echo "❌ Failed to create schema"
    exit 1
fi

echo ""

# Create .env file
echo "🔧 Creating .env file..."

cat > .env << EOF
# ===== Frontend Environment Variables =====
VITE_API_URL=http://localhost:$API_PORT/api

# Google Sheets (optional)
VITE_GOOGLE_APPS_SCRIPT_URL=
VITE_GOOGLE_SHEETS_API_KEY=

# ===== Backend Environment Variables =====
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
PORT=$API_PORT
NODE_ENV=development
EOF

echo "✅ .env file created"
echo ""

# Test connection
echo "🧪 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT COUNT(*) FROM employees;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Could not verify database connection"
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   Setup Complete!                              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Start the backend:"
echo "     npm run server:dev"
echo ""
echo "  2. In another terminal, start the frontend:"
echo "     npm run dev"
echo ""
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "For more information, see:"
echo "  - POSTGRESQL_SETUP.md"
echo "  - DATABASE_README.md"
echo ""
