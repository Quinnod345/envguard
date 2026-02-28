'use strict';

const fs = require('fs');
const path = require('path');

// Patterns for different languages
const PATTERNS = [
  // JavaScript/TypeScript: process.env.VAR_NAME or process.env['VAR_NAME'] or process.env["VAR_NAME"]
  { regex: /process\.env\.([A-Z_][A-Z0-9_]*)/g, lang: 'js' },
  { regex: /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g, lang: 'js' },
  // Vite/SvelteKit: import.meta.env.VITE_*
  { regex: /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g, lang: 'js' },
  // Python: os.environ['VAR'] / os.environ.get('VAR') / os.getenv('VAR')
  { regex: /os\.environ\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g, lang: 'python' },
  { regex: /os\.environ\.get\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, lang: 'python' },
  { regex: /os\.getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, lang: 'python' },
  // Go: os.Getenv("VAR")
  { regex: /os\.Getenv\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, lang: 'go' },
  { regex: /os\.LookupEnv\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, lang: 'go' },
  // Ruby: ENV['VAR'] / ENV.fetch('VAR')
  { regex: /ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g, lang: 'ruby' },
  { regex: /ENV\.fetch\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, lang: 'ruby' },
  // Rust: std::env::var("VAR") / env::var("VAR") / env!("VAR")
  { regex: /env::var\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, lang: 'rust' },
  { regex: /env!\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, lang: 'rust' },
  // PHP: getenv('VAR') / $_ENV['VAR'] / $_SERVER['VAR']
  { regex: /getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\)/g, lang: 'php' },
  { regex: /\$_ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g, lang: 'php' },
  // .NET: Environment.GetEnvironmentVariable("VAR")
  { regex: /Environment\.GetEnvironmentVariable\(\s*"([A-Z_][A-Z0-9_]*)"\s*\)/g, lang: 'dotnet' },
];

const EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.go',
  '.rb', '.erb',
  '.rs',
  '.php',
  '.cs', '.vb',
  '.vue', '.svelte',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'vendor', '.venv', 'venv', 'env', '.env', 'coverage',
  '.turbo', '.nuxt', '.output', 'target', 'bin', 'obj',
]);

function shouldIgnore(name, ignorePatterns) {
  if (IGNORE_DIRS.has(name)) return true;
  return ignorePatterns.some(p => name.includes(p));
}

function walkDir(dir, ignorePatterns, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env') continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnore(entry.name, ignorePatterns)) {
        walkDir(fullPath, ignorePatterns, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function scanFile(filePath) {
  const refs = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return refs;
  }

  const lines = content.split('\n');

  for (const pattern of PATTERNS) {
    // Reset regex state
    pattern.regex.lastIndex = 0;

    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const varName = match[1];
      // Find line number
      const pos = match.index;
      let line = 1;
      for (let i = 0; i < pos && i < content.length; i++) {
        if (content[i] === '\n') line++;
      }

      // Check if var has a default/fallback
      const lineContent = lines[line - 1] || '';
      const hasDefault = checkForDefault(lineContent, varName, pattern.lang);

      refs.push({
        name: varName,
        file: filePath,
        line,
        lang: pattern.lang,
        hasDefault,
      });
    }
  }

  return refs;
}

function checkForDefault(lineContent, varName, lang) {
  // JS: process.env.X || 'default' / process.env.X ?? 'default'
  if (lang === 'js') {
    return /\|\||(?:\?\?)/.test(lineContent.split(varName)[1] || '');
  }
  // Python: os.environ.get('X', 'default') / os.getenv('X', 'default')
  if (lang === 'python') {
    const after = lineContent.split(varName)[1] || '';
    return /['"],\s*['"]/.test(after) || /['"],\s*\w/.test(after);
  }
  // Go: checked via ok pattern with LookupEnv
  if (lang === 'go') {
    return lineContent.includes('LookupEnv');
  }
  // Ruby: ENV.fetch with second arg
  if (lang === 'ruby') {
    const after = lineContent.split(varName)[1] || '';
    return /['"],\s*['"]/.test(after);
  }
  return false;
}

function scanProject(dir, ignorePatterns = []) {
  const files = walkDir(dir, ignorePatterns);
  const allRefs = [];
  const seen = new Map(); // varName -> first ref

  for (const file of files) {
    const refs = scanFile(file);
    for (const ref of refs) {
      ref.file = path.relative(dir, ref.file);
      if (!seen.has(ref.name)) {
        seen.set(ref.name, ref);
        allRefs.push(ref);
      } else {
        // Track additional locations
        const existing = seen.get(ref.name);
        if (!existing.locations) existing.locations = [{ file: existing.file, line: existing.line }];
        existing.locations.push({ file: ref.file, line: ref.line });
        // If any ref has a default, mark it
        if (ref.hasDefault) existing.hasDefault = true;
      }
    }
  }

  return allRefs;
}

module.exports = { scanProject, scanFile, PATTERNS };
