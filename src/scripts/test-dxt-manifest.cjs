#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Simple validation script for DXT manifest.json
 * Checks that the manifest follows the DXT v0.1 specification
 */

const fs = require('fs');
const path = require('path');

// Read manifest from project root (two directories up from src/scripts)
const manifestPath = path.join(__dirname, '..', '..', 'manifest.json');
let manifest;

try {
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(manifestContent);
} catch (error) {
  console.error('❌ Failed to read or parse manifest.json:', error.message);
  process.exit(1);
}

console.log('🔍 Validating DXT manifest...\n');

// Required fields
const requiredFields = [
  'dxt_version',
  'name',
  'version',
  'description',
  'author',
  'server'
];

let hasErrors = false;

// Check required fields
console.log('📋 Checking required fields:');
for (const field of requiredFields) {
  if (Object.prototype.hasOwnProperty.call(manifest, field)) {
    console.log(`  ✅ ${field}: ${typeof manifest[field] === 'object' ? 'present' : manifest[field]}`);
  } else {
    console.log(`  ❌ ${field}: MISSING`);
    hasErrors = true;
  }
}

// Validate author
console.log('\n👤 Validating author:');
if (manifest.author) {
  if (manifest.author.name) {
    console.log(`  ✅ name: ${manifest.author.name}`);
  } else {
    console.log('  ❌ name: MISSING (required)');
    hasErrors = true;
  }
}

// Validate server configuration
console.log('\n⚙️  Validating server configuration:');
if (manifest.server) {
  const server = manifest.server;
  
  if (server.type) {
    if (['node', 'python', 'binary'].includes(server.type)) {
      console.log(`  ✅ type: ${server.type}`);
    } else {
      console.log(`  ❌ type: ${server.type} (must be 'node', 'python', or 'binary')`);
      hasErrors = true;
    }
  } else {
    console.log('  ❌ type: MISSING');
    hasErrors = true;
  }
  
  if (server.entry_point) {
    console.log(`  ✅ entry_point: ${server.entry_point}`);
  } else {
    console.log('  ❌ entry_point: MISSING');
    hasErrors = true;
  }
  
  if (server.mcp_config) {
    console.log('  ✅ mcp_config: present');
  } else {
    console.log('  ❌ mcp_config: MISSING');
    hasErrors = true;
  }
}

// Validate tools
console.log('\n🔧 Validating tools:');
if (manifest.tools && Array.isArray(manifest.tools)) {
  console.log(`  ✅ ${manifest.tools.length} tools defined`);
  for (const tool of manifest.tools) {
    if (!tool.name || !tool.description) {
      console.log(`  ⚠️  Tool missing name or description`);
    }
  }
} else {
  console.log('  ℹ️  No tools defined');
}

// Validate user configuration
console.log('\n⚙️  Validating user configuration:');
if (manifest.user_config) {
  const configs = Object.keys(manifest.user_config);
  console.log(`  ✅ ${configs.length} user configurations defined`);
  for (const config of configs) {
    console.log(`     - ${config}: ${manifest.user_config[config].type}`);
  }
} else {
  console.log('  ℹ️  No user configuration defined');
}

// Summary
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('  ❌ Manifest has errors that need to be fixed');
  process.exit(1);
} else {
  console.log('  ✅ Manifest is valid!');
  console.log(`  📦 Ready to build ${manifest.name} v${manifest.version}`);
} 