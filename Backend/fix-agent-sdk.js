#!/usr/bin/env node

/**
 * Fix script for @mariposa-plus/agent-sdk missing dist/index.js
 * This script creates the missing index.js file in the installed npm package
 */

const fs = require('fs');
const path = require('path');

const agentSdkPath = path.join(__dirname, 'node_modules', '@mariposa-plus', 'agent-sdk');
const distPath = path.join(agentSdkPath, 'dist');
const indexPath = path.join(distPath, 'index.js');

// Content for the missing index.js file
const indexContent = `const { SimpleAgent, Utils } = require('./src');

module.exports = {
  SimpleAgent,
  Utils
};

module.exports.default = SimpleAgent;
`;

try {
  // Check if the agent-sdk package exists
  if (!fs.existsSync(agentSdkPath)) {
    console.log('❌ @mariposa-plus/agent-sdk package not found. Please install it first with: npm install @mariposa-plus/agent-sdk');
    process.exit(1);
  }

  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.log('❌ dist directory not found in @mariposa-plus/agent-sdk package');
    process.exit(1);
  }

  // Check if index.js already exists
  if (fs.existsSync(indexPath)) {
    console.log('✅ dist/index.js already exists in @mariposa-plus/agent-sdk');
    process.exit(0);
  }

  // Create the missing index.js file
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('✅ Successfully created dist/index.js in @mariposa-plus/agent-sdk');
  console.log('🔧 The agent-sdk import issue has been fixed!');

} catch (error) {
  console.error('❌ Error fixing agent-sdk:', error.message);
  process.exit(1);
}