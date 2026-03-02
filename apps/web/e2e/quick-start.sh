#!/bin/bash

# CotizaPro E2E Test Quick Start Script
# This script sets up and runs E2E tests

set -e

echo "=============================================="
echo "CotizaPro E2E Test Quick Start"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "ERROR: npm is not installed."
  exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install
echo ""

echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create test users in Supabase:"
echo "   - owner@example.com (password: TestPassword123!)"
echo "   - admin@example.com (password: TestPassword123!)"
echo "   - member@example.com (password: TestPassword123!)"
echo ""
echo "2. Start the dev server:"
echo "   npm run dev"
echo ""
echo "3. In another terminal, run tests:"
echo "   npm run test:e2e           # Run all tests"
echo "   npm run test:e2e:headed    # See browser"
echo "   npm run test:e2e:ui        # Interactive mode"
echo ""
echo "4. View results:"
echo "   npm run test:e2e:report"
echo ""
echo "=============================================="
