#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Create dist directory
echo "Creating dist directory..."
rm -rf dist
mkdir -p dist

# Copy all necessary files
echo "Copying files..."
cp index.html dist/ || { echo "Error: Failed to copy index.html"; exit 1; }
cp styles.css dist/ || { echo "Error: Failed to copy styles.css"; exit 1; }
cp app.js dist/ || { echo "Error: Failed to copy app.js"; exit 1; }
cp _redirects dist/ || { echo "Error: Failed to copy _redirects"; exit 1; }

# Verify files were copied
echo "Verifying files..."
if [ ! -f "dist/index.html" ]; then
    echo "Error: index.html not found in dist directory"
    exit 1
fi

if [ ! -f "dist/styles.css" ]; then
    echo "Error: styles.css not found in dist directory"
    exit 1
fi

if [ ! -f "dist/app.js" ]; then
    echo "Error: app.js not found in dist directory"
    exit 1
fi

if [ ! -f "dist/_redirects" ]; then
    echo "Error: _redirects not found in dist directory"
    exit 1
fi

echo "Build completed successfully! Files are ready in the dist directory." 