# envguard

Scan your codebase for environment variables, find missing and unused vars, and generate `.env.example` files automatically.

**Zero dependencies. Works with JS/TS, Python, Go, Ruby, Rust, PHP, and .NET.**

```
$ envguard

  envguard — scanned 12 variables across 2 env files

  ✗ 3 missing variables
    • JWT_SECRET  src/auth.ts:14  (no default!)
    • REDIS_URL   src/cache.ts:3  (no default!)
    • SMTP_HOST   src/mail.ts:7   (has fallback)

  ⚠ 1 unused variable in env files
    • OLD_API_KEY  defined in .env

  9 documented  ·  3 missing  ·  1 unused
```

## Install

```bash
npm install -g envguard
```

Or use without installing:

```bash
npx envguard
```

## Usage

```bash
# Scan current directory
envguard

# Scan a specific directory
envguard ./my-app

# CI mode — exit code 1 if missing vars found
envguard --ci

# Strict CI — also fail on unused vars
envguard --ci --strict

# JSON output for tooling
envguard --json

# Generate .env.example from code
envguard --generate
envguard -g

# Output .env.example to stdout
envguard -g -q
```

## What It Detects

| Language | Patterns |
|----------|----------|
| **JS/TS** | `process.env.X`, `process.env['X']`, `import.meta.env.X` |
| **Python** | `os.environ['X']`, `os.environ.get('X')`, `os.getenv('X')` |
| **Go** | `os.Getenv("X")`, `os.LookupEnv("X")` |
| **Ruby** | `ENV['X']`, `ENV.fetch('X')` |
| **Rust** | `env::var("X")`, `env!("X")` |
| **PHP** | `getenv('X')`, `$_ENV['X']` |
| **.NET** | `Environment.GetEnvironmentVariable("X")` |

## CI Integration

Add to your CI pipeline to catch missing env vars before deployment:

```yaml
# GitHub Actions
- name: Check env vars
  run: npx envguard --ci
```

```yaml
# GitLab CI
check-env:
  script:
    - npx envguard --ci --strict
```

## Options

| Flag | Description |
|------|-------------|
| `--ci` | Exit with code 1 if missing variables found |
| `--strict` | With `--ci`, also fail on unused variables |
| `--json` | Output results as JSON |
| `-g, --generate` | Generate `.env.example` from code |
| `--env-file <f>` | Specify env file(s) to check (repeatable) |
| `--ignore <pat>` | Ignore files matching pattern (repeatable) |
| `-q, --quiet` | Only output errors (or stdout for `--generate`) |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Programmatic API

```js
const { scanProject, parseEnvFiles, analyze } = require('envguard');

const refs = scanProject('./my-app');
const envVars = parseEnvFiles('./my-app');
const result = analyze(refs, envVars);

console.log(result.missing);  // vars in code but not in .env
console.log(result.unused);   // vars in .env but not in code
```

## License

MIT © [Oneiro](https://github.com/Quinnod345)
