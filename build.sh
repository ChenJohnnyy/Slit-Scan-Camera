#!/bin/bash

# Create dist directory
mkdir -p dist

# Copy all necessary files
cp index.html dist/
cp styles.css dist/
cp app.js dist/
cp _redirects dist/

echo "Build completed! Files are ready in the dist directory." 