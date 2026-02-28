'use strict';

const COLORS = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue: s => `\x1b[34m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

// Disable colors if not TTY
const c = process.stdout.isTTY ? COLORS : Object.fromEntries(
  Object.keys(COLORS).map(k => [k, s => s])
);

function formatReport(result, opts = {}) {
  const lines = [];

  lines.push('');
  lines.push(c.bold('  envguard') + c.dim(` — scanned ${result.codeVarCount} variables across ${result.envFiles.length || 0} env files`));
  lines.push('');

  // Missing vars (critical)
  if (result.missing.length > 0) {
    lines.push(c.red(`  ✗ ${result.missing.length} missing variable${result.missing.length === 1 ? '' : 's'}`));
    for (const m of result.missing) {
      const def = m.hasDefault ? c.dim(' (has fallback)') : c.red(' (no default!)');
      lines.push(`    ${c.red('•')} ${c.bold(m.name)} ${c.dim(`${m.file}:${m.line}`)}${def}`);
    }
    lines.push('');
  }

  // Unused vars (warning)
  if (result.unused.length > 0) {
    lines.push(c.yellow(`  ⚠ ${result.unused.length} unused variable${result.unused.length === 1 ? '' : 's'} in env files`));
    for (const u of result.unused) {
      lines.push(`    ${c.yellow('•')} ${c.bold(u.name)} ${c.dim(`defined in ${u.sources.join(', ')}`)}`);
    }
    lines.push('');
  }

  // Summary
  if (result.missing.length === 0 && result.unused.length === 0) {
    lines.push(c.green('  ✓ All environment variables are accounted for'));
    lines.push('');
  } else if (result.missing.length === 0) {
    lines.push(c.green('  ✓ No missing variables'));
    lines.push('');
  }

  // Stats
  const stats = [
    `${result.documented.length} documented`,
    `${result.missing.length} missing`,
    `${result.unused.length} unused`,
  ];
  lines.push(c.dim(`  ${stats.join('  ·  ')}`));
  lines.push('');

  return lines.join('\n');
}

function formatJson(result) {
  return JSON.stringify({
    missing: result.missing.map(m => ({
      name: m.name,
      file: m.file,
      line: m.line,
      hasDefault: m.hasDefault,
    })),
    unused: result.unused.map(u => ({
      name: u.name,
      definedIn: u.sources,
    })),
    summary: {
      codeVars: result.codeVarCount,
      envVars: result.envVarCount,
      documented: result.documented.length,
      missing: result.missing.length,
      unused: result.unused.length,
      envFiles: result.envFiles,
    },
  }, null, 2);
}

module.exports = { formatReport, formatJson };
