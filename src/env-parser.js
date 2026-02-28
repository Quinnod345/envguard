'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_ENV_FILES = ['.env', '.env.example', '.env.local', '.env.development', '.env.production', '.env.test'];

function parseEnvFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    let key = trimmed.slice(0, eqIndex).trim();
    // Remove export prefix
    if (key.startsWith('export ')) key = key.slice(7).trim();

    const value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    const unquoted = value.replace(/^(['"])(.*)\1$/, '$2');

    vars[key] = {
      value: unquoted,
      hasValue: value.length > 0,
      file: filePath,
    };
  }

  return vars;
}

function parseEnvFiles(dir, userFiles = []) {
  const filesToCheck = userFiles.length > 0 ? userFiles : DEFAULT_ENV_FILES;
  const result = {
    files: [],      // which files were found
    vars: {},       // merged var -> { value, hasValue, file, sources }
    byFile: {},     // file -> vars
  };

  for (const f of filesToCheck) {
    const fullPath = path.isAbsolute(f) ? f : path.join(dir, f);
    const vars = parseEnvFile(fullPath);
    if (!vars) continue;

    const relPath = path.relative(dir, fullPath);
    result.files.push(relPath);
    result.byFile[relPath] = vars;

    for (const [key, info] of Object.entries(vars)) {
      if (!result.vars[key]) {
        result.vars[key] = { ...info, file: relPath, sources: [relPath] };
      } else {
        result.vars[key].sources.push(relPath);
        // Prefer the one with a value
        if (info.hasValue && !result.vars[key].hasValue) {
          result.vars[key].value = info.value;
          result.vars[key].hasValue = true;
        }
      }
    }
  }

  return result;
}

module.exports = { parseEnvFiles, parseEnvFile };
