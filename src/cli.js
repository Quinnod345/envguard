'use strict';

const path = require('path');
const { scanProject } = require('./scanner');
const { parseEnvFiles } = require('./env-parser');
const { analyze } = require('./analyzer');
const { formatReport, formatJson } = require('./reporter');
const { generateEnvExample } = require('./generator');

function parseArgs(argv) {
  const opts = {
    dir: '.',
    ci: false,
    json: false,
    generate: false,
    envFiles: [],
    ignore: [],
    quiet: false,
    help: false,
    version: false,
    strict: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--ci') opts.ci = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--generate' || arg === '-g') opts.generate = true;
    else if (arg === '--quiet' || arg === '-q') opts.quiet = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--version' || arg === '-v') opts.version = true;
    else if (arg === '--env-file' && argv[i + 1]) opts.envFiles.push(argv[++i]);
    else if (arg === '--ignore' && argv[i + 1]) opts.ignore.push(argv[++i]);
    else if (!arg.startsWith('-')) opts.dir = arg;
  }

  return opts;
}

const HELP = `
  envguard - Find missing, unused, and undocumented environment variables

  Usage:
    envguard [directory] [options]

  Options:
    --ci            Exit with code 1 if missing variables found
    --json          Output results as JSON
    --generate, -g  Generate .env.example from code references
    --strict        Also fail on unused vars in .env files
    --env-file <f>  Specify env file(s) to check (default: .env, .env.example, .env.local, .env.development)
    --ignore <pat>  Ignore files matching pattern (can repeat)
    --quiet, -q     Only output errors
    --help, -h      Show this help
    --version, -v   Show version

  Examples:
    envguard                     Scan current directory
    envguard ./my-app --ci       Scan with CI mode (fails on missing)
    envguard -g                  Generate .env.example
    envguard --json              Machine-readable output
`;

function run(argv) {
  const opts = parseArgs(argv);

  if (opts.version) {
    const pkg = require('../package.json');
    console.log(pkg.version);
    return;
  }

  if (opts.help) {
    console.log(HELP);
    return;
  }

  const dir = path.resolve(opts.dir);

  // Scan code for env var references
  const codeRefs = scanProject(dir, opts.ignore);

  // Parse .env files
  const envVars = parseEnvFiles(dir, opts.envFiles);

  if (opts.generate) {
    const content = generateEnvExample(codeRefs);
    if (opts.quiet) {
      process.stdout.write(content);
    } else {
      const fs = require('fs');
      const outPath = path.join(dir, '.env.example');
      fs.writeFileSync(outPath, content);
      console.log(`✓ Generated ${outPath} with ${codeRefs.length} variables`);
    }
    return;
  }

  // Analyze
  const result = analyze(codeRefs, envVars);

  if (opts.json) {
    console.log(formatJson(result));
    return;
  }

  if (!opts.quiet || result.missing.length > 0 || (opts.strict && result.unused.length > 0)) {
    console.log(formatReport(result, opts));
  }

  // Exit codes for CI
  if (opts.ci) {
    if (result.missing.length > 0) process.exit(1);
    if (opts.strict && result.unused.length > 0) process.exit(1);
  }
}

module.exports = { run };
