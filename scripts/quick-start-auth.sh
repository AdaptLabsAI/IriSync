#!/bin/bash

# Quick Start Setup Script for IriSync Authentication
# This script helps generate required secrets and validates environment setup

set -e

echo "🚀 IriSync Authentication Quick Start"
echo "======================================"
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file found"
else
    echo "⚠️  .env.local not found. Creating from template..."
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo "✅ Created .env.local from template"
    else
        echo "❌ ERROR: .env.local.example not found"
        exit 1
    fi
fi

echo ""
echo "🔐 Generating NEXTAUTH_SECRET..."
echo "================================"

# Generate NEXTAUTH_SECRET
SECRET=$(openssl rand -base64 32)
echo ""
echo "Your NEXTAUTH_SECRET:"
echo "--------------------"
echo "$SECRET"
echo ""

# Check if NEXTAUTH_SECRET already exists in .env.local
if grep -q "^NEXTAUTH_SECRET=" .env.local; then
    echo "⚠️  NEXTAUTH_SECRET already exists in .env.local"
    read -p "Do you want to replace it? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Replace existing secret
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env.local
        else
            # Linux
            sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env.local
        fi
        echo "✅ NEXTAUTH_SECRET updated in .env.local"
    else
        echo "⏭️  Skipped updating NEXTAUTH_SECRET"
    fi
else
    # Add new secret
    echo "" >> .env.local
    echo "# Generated NEXTAUTH_SECRET" >> .env.local
    echo "NEXTAUTH_SECRET=$SECRET" >> .env.local
    echo "✅ NEXTAUTH_SECRET added to .env.local"
fi

echo ""
echo "📋 Environment Variable Checklist"
echo "================================="
echo ""

# Check for required variables
REQUIRED_VARS=(
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "FIREBASE_ADMIN_PROJECT_ID"
    "FIREBASE_ADMIN_CLIENT_EMAIL"
    "FIREBASE_ADMIN_PRIVATE_KEY"
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
)

MISSING_COUNT=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$VAR=.\+" .env.local; then
        echo "✅ $VAR is set"
    else
        echo "❌ $VAR is NOT set"
        ((MISSING_COUNT++))
    fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo "Missing required variables: $MISSING_COUNT"
echo ""

if [ $MISSING_COUNT -eq 0 ]; then
    echo "🎉 All required environment variables are set!"
    echo ""
    echo "Next steps:"
    echo "1. Review .env.local and verify all values are correct"
    echo "2. Run: npm install"
    echo "3. Run: npm run dev"
    echo "4. Visit: http://localhost:3000/login"
else
    echo "⚠️  Please set the missing environment variables in .env.local"
    echo ""
    echo "Reference guides:"
    echo "- .env.local.example - Template with all variables"
    echo "- AUTH_SECURITY_SETUP_GUIDE.md - Complete setup guide"
    echo "- VERCEL_ENV_SETUP.md - Vercel deployment guide"
fi

echo ""
echo "📚 Documentation"
echo "==============="
echo "- AUTH_SECURITY_SETUP_GUIDE.md - Complete authentication setup"
echo "- VERCEL_ENV_SETUP.md - Vercel environment variables"
echo "- FIGMA_INTEGRATION_SETUP.md - Figma MCP integration"
echo ""

# Optional: Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules not found"
    read -p "Do you want to install dependencies now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing dependencies..."
        npm install
        echo "✅ Dependencies installed"
    fi
fi

echo ""
echo "✨ Setup complete! Check the documentation for next steps."
