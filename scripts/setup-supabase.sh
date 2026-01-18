#!/bin/bash

# Setup script for Supabase configuration
# This script helps you set up your environment variables and verify your setup

set -e

echo "🚀 AI News Podcast - Supabase Setup"
echo "====================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
fi

# Function to check if a value is set and not a placeholder
is_configured() {
    local value="$1"
    if [ -z "$value" ] || [[ "$value" == *"your_"* ]] || [[ "$value" == *"_here"* ]]; then
        return 1
    fi
    return 0
}

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

echo "📋 Checking Configuration Status:"
echo "--------------------------------"

# Check Anthropic API
if is_configured "$ANTHROPIC_API_KEY"; then
    echo "✅ Anthropic API Key: Configured"
else
    echo "❌ Anthropic API Key: Not configured"
fi

# Check Brave API
if is_configured "$BRAVE_API_KEY"; then
    echo "✅ Brave Search API Key: Configured"
else
    echo "❌ Brave Search API Key: Not configured"
fi

# Check OpenAI API
if is_configured "$OPENAI_API_KEY"; then
    echo "✅ OpenAI API Key: Configured"
else
    echo "❌ OpenAI API Key: Not configured"
fi

# Check Supabase
if is_configured "$NEXT_PUBLIC_SUPABASE_URL"; then
    echo "✅ Supabase URL: Configured"
else
    echo "❌ Supabase URL: Not configured"
fi

if is_configured "$NEXT_PUBLIC_SUPABASE_ANON_KEY"; then
    echo "✅ Supabase Anon Key: Configured"
else
    echo "❌ Supabase Anon Key: Not configured"
fi

echo ""
echo "📚 Next Steps:"
echo "-------------"
echo "1. If any items are not configured, edit .env.local with your API keys"
echo "2. Follow SUPABASE_MCP_SETUP.md for complete Supabase setup"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "💡 Tips:"
echo "  - Get Anthropic API key: https://console.anthropic.com/"
echo "  - Get Brave API key: https://brave.com/search/api/"
echo "  - Get OpenAI API key: https://platform.openai.com/api-keys"
echo "  - Create Supabase project: https://supabase.com/dashboard"
echo ""

# Test Node.js installation
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed. Run 'npm install'"
fi

echo ""
echo "🎯 Ready to configure? Edit .env.local and follow the setup guide!"
