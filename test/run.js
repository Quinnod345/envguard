#!/usr/bin/env node
'use strict';

const path = require('path');
const { scanProject } = require('../src/scanner');
const { parseEnvFiles } = require('../src/env-parser');
const { analyze } = require('../src/analyzer');

const fixtureDir = path.join(__dirname, 'fixtures', 'sample-app');

console.log('Running envguard tests...\n');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}

// Test scanning
const refs = scanProject(fixtureDir);
const names = refs.map(r => r.name);
assert(names.includes('API_KEY'), 'Finds process.env.X');
assert(names.includes('DATABASE_URL'), 'Finds process.env.X (JS)');
assert(names.includes('REDIS_URL'), 'Finds process.env["X"]');
assert(names.includes('ONLY_IN_PYTHON'), 'Finds os.getenv()');
assert(names.includes('PYTHON_SECRET'), 'Finds os.environ.get()');

// Test defaults detection
const portRef = refs.find(r => r.name === 'PORT');
assert(portRef && portRef.hasDefault, 'Detects || default');
const nodeEnvRef = refs.find(r => r.name === 'NODE_ENV');
assert(nodeEnvRef && nodeEnvRef.hasDefault, 'Detects ?? default');
const pyRef = refs.find(r => r.name === 'PYTHON_SECRET');
assert(pyRef && pyRef.hasDefault, 'Detects Python default');

// Test env parsing
const envVars = parseEnvFiles(fixtureDir);
assert(envVars.files.length > 0, 'Finds .env files');
assert(envVars.vars['API_KEY'], 'Parses env vars');
assert(envVars.vars['LEGACY_VAR'], 'Parses all env vars');

// Test analysis
const result = analyze(refs, envVars);
assert(result.missing.length > 0, 'Finds missing vars');
assert(result.unused.length > 0, 'Finds unused vars');
assert(result.missing.some(m => m.name === 'JWT_SECRET'), 'JWT_SECRET is missing');
assert(result.unused.some(u => u.name === 'LEGACY_VAR'), 'LEGACY_VAR is unused');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
