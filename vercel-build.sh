#!/bin/bash

echo "Starting Vercel build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build frontend
echo "Building frontend with Vite..."
npm run build

# Copy public assets to dist
echo "Copying public assets..."
mkdir -p dist/public
cp -r public/* dist/public/

# List contents to verify
echo "Build contents:"
ls -la dist/public/

echo "Vercel build completed!"