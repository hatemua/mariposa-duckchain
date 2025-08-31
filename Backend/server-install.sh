#!/bin/bash

# Server installation script for @mariposa-plus/agent-sdk
# Run this on the production server to fix npm installation issues

echo "🔧 Fixing @mariposa-plus/agent-sdk installation on server..."

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove node_modules and package-lock
echo "Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Clear npm registry cache for this specific package
echo "Clearing package registry cache..."
npm cache clean --force @mariposa-plus/agent-sdk

# Try different npm registries if needed
echo "Setting npm registry to default..."
npm config set registry https://registry.npmjs.org/

# Install dependencies with verbose logging
echo "Installing dependencies with verbose logging..."
npm install --verbose

# Verify the package was installed correctly
echo "Verifying @mariposa-plus/agent-sdk installation..."
if [ -d "node_modules/@mariposa-plus/agent-sdk" ]; then
    echo "✅ Package directory exists"
    
    if [ -f "node_modules/@mariposa-plus/agent-sdk/package.json" ]; then
        echo "✅ Package.json exists"
        echo "Package version:"
        cat node_modules/@mariposa-plus/agent-sdk/package.json | grep '"version"'
    else
        echo "❌ Package.json missing"
    fi
    
    if [ -f "node_modules/@mariposa-plus/agent-sdk/dist/index.js" ]; then
        echo "✅ Main entry file exists"
    else
        echo "❌ Main entry file missing - running fix script..."
        node fix-agent-sdk.js
    fi
else
    echo "❌ Package directory missing"
    echo "Trying to install specific version..."
    npm install @mariposa-plus/agent-sdk@1.0.1 --save
fi

# Test import
echo "Testing import..."
node -e "
try { 
    const { SimpleAgent } = require('@mariposa-plus/agent-sdk'); 
    console.log('✅ Import successful - SimpleAgent type:', typeof SimpleAgent); 
} catch(e) { 
    console.log('❌ Import failed:', e.message); 
    process.exit(1);
}
"

echo "🎉 Installation complete!"