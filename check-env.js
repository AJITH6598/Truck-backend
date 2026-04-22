#!/usr/bin/env node
/**
 * ENVIRONMENT VALIDATION SCRIPT
 * Checks if all required environment variables are configured
 */

require('dotenv').config();
const fs = require('fs');

const REQUIRED_VARS = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'CLIENT_URL',
  'BACKEND_URL',
];

const OPTIONAL_VARS = [
  'NODE_ENV',
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║    BACKEND ENVIRONMENT VALIDATION                      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('   Create it from .env.example:');
  console.log('   cp .env.example .env\n');
  process.exit(1);
}

let issues = [];
let warnings = [];

// Check required variables
console.log('📋 Checking Required Variables:\n');
REQUIRED_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const display = varName.includes('PASS') || varName.includes('SECRET') || varName.includes('TOKEN')
      ? '***' + value.slice(-4)
      : value.length > 40
      ? value.slice(0, 40) + '...'
      : value;
    console.log(`  ✅ ${varName.padEnd(20)} = ${display}`);
  } else {
    console.log(`  ❌ ${varName.padEnd(20)} = [MISSING]`);
    issues.push(`Missing required variable: ${varName}`);
  }
});

// Check optional variables
console.log('\n📋 Checking Optional Variables:\n');
OPTIONAL_VARS.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName.padEnd(20)} = ${value}`);
  } else {
    console.log(`  ⓘ  ${varName.padEnd(20)} = [NOT SET]`);
  }
});

// Validate critical values
console.log('\n🔍 Validating Values:\n');

const mongoUri = process.env.MONGO_URI;
if (mongoUri && !mongoUri.includes('mongodb')) {
  console.log('  ⚠️  MONGO_URI does not look like a valid MongoDB connection string');
  warnings.push('Invalid MongoDB URI format');
} else if (mongoUri) {
  console.log('  ✅ MONGO_URI format looks valid');
}

const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length < 10) {
  console.log('  ⚠️  JWT_SECRET should be at least 10 characters');
  warnings.push('JWT_SECRET is too short');
} else if (jwtSecret) {
  console.log('  ✅ JWT_SECRET is sufficiently strong');
}

const emailPort = process.env.EMAIL_PORT;
if (emailPort === '465') {
  console.log('  ✅ EMAIL_PORT = 465 (correct for Gmail SSL)');
} else if (emailPort === '587') {
  console.log('  ⓘ  EMAIL_PORT = 587 (Gmail TLS - less secure)');
} else if (emailPort) {
  console.log(`  ⚠️  EMAIL_PORT = ${emailPort} (unexpected)`);
  warnings.push('Unusual EMAIL_PORT');
}

const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`  ✅ NODE_ENV = ${nodeEnv}`);

// Summary
console.log('\n════════════════════════════════════════════════════════\n');

if (issues.length === 0) {
  console.log('✅ All required environment variables are configured!\n');
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach((w) => console.log(`   • ${w}`));
    console.log();
  }
  console.log('Ready to start the backend with:');
  console.log('   npm start      (production)');
  console.log('   npm run dev    (development)\n');
} else {
  console.log('❌ Environment Configuration Issues Found:\n');
  issues.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue}`);
  });
  console.log('\nFix these issues before starting the server.\n');
  process.exit(1);
}
