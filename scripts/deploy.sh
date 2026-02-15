#!/bin/bash

# CotizaPro Deployment Script
# This script automates the deployment process to production

set -e # Exit on error

echo "🚀 CotizaPro Deployment Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi
log_info "Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi
log_info "npm: $(npm --version)"

echo ""

# Ask for deployment target
echo "Select deployment target:"
echo "1) Vercel"
echo "2) Docker (local)"
echo "3) Docker (production server)"
echo "4) All of the above"
read -p "Enter choice [1-4]: " deploy_choice

case $deploy_choice in
    1)
        echo ""
        echo "📦 Deploying to Vercel..."

        if ! command -v vercel &> /dev/null; then
            log_warn "Vercel CLI not installed. Installing..."
            npm install -g vercel
        fi

        log_info "Running build..."
        npm run build

        log_info "Deploying to Vercel..."
        vercel --prod

        log_info "Deployment to Vercel complete!"
        ;;

    2)
        echo ""
        echo "🐳 Building Docker image (local)..."

        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed"
            exit 1
        fi

        log_info "Building image..."
        docker build -t cotizapro:latest .

        log_info "Starting containers..."
        docker-compose up -d

        log_info "Docker deployment complete!"
        log_info "App running at http://localhost:3000"
        ;;

    3)
        echo ""
        echo "🐳 Deploying to production server..."

        read -p "Enter server SSH address (user@host): " server_address

        if [ -z "$server_address" ]; then
            log_error "Server address is required"
            exit 1
        fi

        log_info "Building Docker image..."
        docker build -t cotizapro:latest .

        log_info "Saving image..."
        docker save cotizapro:latest | gzip > cotizapro-latest.tar.gz

        log_info "Uploading to server..."
        scp cotizapro-latest.tar.gz docker-compose.yml .env.production "$server_address:~/cotizapro/"

        log_info "Loading image on server..."
        ssh "$server_address" "cd ~/cotizapro && docker load < cotizapro-latest.tar.gz && docker-compose down && docker-compose up -d"

        log_info "Cleaning up..."
        rm cotizapro-latest.tar.gz

        log_info "Production deployment complete!"
        ;;

    4)
        echo ""
        log_warn "This will deploy to all targets. Continue? (y/n)"
        read -p "" confirm

        if [ "$confirm" != "y" ]; then
            log_info "Deployment cancelled"
            exit 0
        fi

        # Deploy to Vercel
        echo ""
        echo "📦 Deploying to Vercel..."
        npm run build
        vercel --prod
        log_info "Vercel deployment complete!"

        # Build Docker
        echo ""
        echo "🐳 Building Docker image..."
        docker build -t cotizapro:latest .
        log_info "Docker build complete!"

        log_info "All deployments complete!"
        ;;

    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=============================="
echo "🎉 Deployment Complete!"
echo "=============================="
