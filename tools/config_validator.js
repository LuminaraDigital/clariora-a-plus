#!/usr/bin/env node
/**
 * tools/config_validator.js
 *
 * Standalone runtime configuration validator for Clariora A+.
 * Checks environment variables for required keys, formatting, entropy,
 * and rejection of placeholder dummy values.
 *
 * Usage:
 *   node tools/config_validator.js [--env-file=.env] [--strict] [--json]
 *   Or import as a module:
 *   const { validateConfig, calculateShannonEntropy } = require('./config_validator');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'CLOUDFLARE_ZONE_ID',
  'ADMIN_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'WEB_APP_URL',
  'EDGE_WEBHOOK_SECRET',
];

const SUBSTRING_PLACEHOLDERS = [
  'your-token',
  'your_token',
  'your-api-key',
  'your_api_key',
  'your-secret',
  'your_secret',
  'insert_here',
  'insert-here',
  'placeholder',
  'changeme',
  'change_me',
  'replace_me',
  'replace-me',
  'test_token',
];

const EXACT_PLACEHOLDERS = [
  'example',
  'sample',
  'dummy',
  '123456',
  'abcdef',
  'todo',
  'secret',
  'password',
  'token',
];

/**
 * Calculates Shannon entropy in bits per character.
 * @param {string} str
 * @returns {number}
 */
function calculateShannonEntropy(str) {
  if (!str || typeof str !== 'string' || str.length === 0) return 0;
  const freq = {};
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

/**
 * Counts unique characters in a string.
 * @param {string} str
 * @returns {number}
 */
function countUniqueChars(str) {
  if (!str || typeof str !== 'string') return 0;
  return new Set(str).size;
}

/**
 * Determines if a value matches known dummy/placeholder strings.
 * @param {string} val
 * @returns {boolean}
 */
function isPlaceholder(val) {
  if (!val || typeof val !== 'string') return true;
  const clean = val.trim().toLowerCase();
  if (clean === '') return true;

  // Substring matches for obvious placeholder phrases
  for (const ph of SUBSTRING_PLACEHOLDERS) {
    if (clean.includes(ph)) return true;
  }

  // Exact matches for generic words or sequences
  for (const ph of EXACT_PLACEHOLDERS) {
    if (clean === ph) return true;
  }

  // Trivial repetitive patterns (e.g. "aaaaa...", "00000...", "123123...")
  if (/^(.)\1{5,}$/.test(clean)) return true;
  if (/^(.{2,4})\1{3,}$/.test(clean)) return true;

  return false;
}

/**
 * Minimal zero-dependency .env parser.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseEnvContent(content) {
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

/**
 * Load environment from file or default to process.env.
 * @param {string} [filePath]
 * @returns {Record<string, string>}
 */
function loadEnv(filePath) {
  const env = { ...process.env };
  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseEnvContent(content);
    Object.assign(env, parsed);
  }
  return env;
}

/**
 * Schema definitions and validation rules for each key.
 */
const KEY_SCHEMAS = {
  CLOUDFLARE_API_TOKEN: {
    label: 'Cloudflare API Token',
    required: true,
    minEntropy: 2.8,
    minUniqueChars: 12,
    validate: (val) => {
      if (typeof val !== 'string' || val.length < 30) {
        return 'Must be at least 30 characters in length';
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(val)) {
        return 'Must contain only alphanumeric characters, underscores, or dashes';
      }
      return null;
    },
  },
  CLOUDFLARE_ACCOUNT_ID: {
    label: 'Cloudflare Account ID',
    required: true,
    minEntropy: 2.5,
    minUniqueChars: 8,
    validate: (val) => {
      if (!/^[a-fA-F0-9]{32}$/.test(val)) {
        return 'Must be a 32-character hexadecimal string';
      }
      return null;
    },
  },
  CLOUDFLARE_ZONE_ID: {
    label: 'Cloudflare Zone ID',
    required: true,
    minEntropy: 2.5,
    minUniqueChars: 8,
    validate: (val) => {
      if (!/^[a-fA-F0-9]{32}$/.test(val)) {
        return 'Must be a 32-character hexadecimal string';
      }
      return null;
    },
  },
  R2_ACCESS_KEY_ID: {
    label: 'R2 Access Key ID',
    required: true,
    minEntropy: 2.5,
    minUniqueChars: 8,
    validate: (val) => {
      if (!/^[a-fA-F0-9]{32}$/.test(val)) {
        return 'Must be a 32-character hexadecimal string';
      }
      return null;
    },
  },
  R2_SECRET_ACCESS_KEY: {
    label: 'R2 Secret Access Key',
    required: true,
    minEntropy: 3.0,
    minUniqueChars: 10,
    validate: (val) => {
      if (!/^[a-fA-F0-9]{64}$/.test(val)) {
        return 'Must be a 64-character hexadecimal string';
      }
      return null;
    },
  },
  R2_ENDPOINT: {
    label: 'R2 S3 API Endpoint',
    required: true,
    validate: (val, allEnv) => {
      let parsed;
      try {
        parsed = new URL(val);
      } catch {
        return 'Must be a valid HTTPS URL (e.g., https://<account_id>.r2.cloudflarestorage.com)';
      }
      if (parsed.protocol !== 'https:') {
        return 'Endpoint protocol must be https:';
      }
      if (!parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
        return 'Endpoint host must end with .r2.cloudflarestorage.com';
      }
      if (allEnv && allEnv.CLOUDFLARE_ACCOUNT_ID) {
        const expectedHost = `${allEnv.CLOUDFLARE_ACCOUNT_ID.toLowerCase()}.r2.cloudflarestorage.com`;
        if (parsed.hostname.toLowerCase() !== expectedHost) {
          return `Endpoint hostname "${parsed.hostname}" does not match CLOUDFLARE_ACCOUNT_ID "${expectedHost}"`;
        }
      }
      return null;
    },
  },
  ADMIN_API_KEY: {
    label: 'Admin Shared Secret API Key',
    required: true,
    minEntropy: 3.0,
    minUniqueChars: 10,
    validate: (val) => {
      if (typeof val !== 'string' || val.length < 32) {
        return 'Must be at least 32 characters in length (64 hex characters recommended)';
      }
      return null;
    },
  },
  TELEGRAM_BOT_TOKEN: {
    label: 'Telegram Bot Token',
    required: true,
    minEntropy: 2.8,
    minUniqueChars: 12,
    validate: (val) => {
      if (!/^\d{8,12}:[A-Za-z0-9_-]{30,50}$/.test(val)) {
        return 'Must match Telegram Bot Token format (<bot_id>:<alphanumeric_secret>)';
      }
      return null;
    },
  },
  WEB_APP_URL: {
    label: 'Web Application URL',
    required: true,
    validate: (val) => {
      let parsed;
      try {
        parsed = new URL(val);
      } catch {
        return 'Must be a valid URL (e.g., https://clariora.com.au/app)';
      }
      if (parsed.protocol !== 'https:' && !parsed.hostname.includes('localhost')) {
        return 'Production Web App URL must use HTTPS';
      }
      return null;
    },
  },
  EDGE_WEBHOOK_SECRET: {
    label: 'Edge Webhook Secret Token',
    required: true,
    minEntropy: 2.5,
    minUniqueChars: 8,
    validate: (val) => {
      if (typeof val !== 'string' || val.length < 16) {
        return 'Must be at least 16 characters in length (32+ recommended)';
      }
      return null;
    },
  },
};

/**
 * Validates a configuration environment map.
 *
 * @param {Record<string, string>} env
 * @param {{ strict?: boolean, allowMissing?: boolean }} [options]
 * @returns {{
 *   valid: boolean,
 *   errors: Array<{ key: string, message: string }>,
 *   warnings: Array<{ key: string, message: string }>,
 *   results: Record<string, { ok: boolean, entropy?: number, uniqueChars?: number, message?: string }>
 * }}
 */
function validateConfig(env, options = {}) {
  const strict = options.strict !== false; // default true unless allowMissing
  const allowMissing = options.allowMissing === true || !strict;

  const errors = [];
  const warnings = [];
  const results = {};

  for (const key of REQUIRED_KEYS) {
    const schema = KEY_SCHEMAS[key];
    const val = env[key];

    if (!val || typeof val !== 'string' || val.trim() === '') {
      if (!allowMissing) {
        errors.push({ key, message: `Missing required environment variable: ${key}` });
        results[key] = { ok: false, message: 'Missing required key' };
      } else {
        warnings.push({ key, message: `Optional/unset variable in non-strict mode: ${key}` });
        results[key] = { ok: true, skipped: true, message: 'Unset (non-strict)' };
      }
      continue;
    }

    const trimmed = val.trim();

    // Check placeholder / dummy values
    if (isPlaceholder(trimmed)) {
      errors.push({ key, message: `Value is a placeholder or rejected dummy string: "${trimmed}"` });
      results[key] = { ok: false, message: 'Placeholder value rejected' };
      continue;
    }

    // Format & structural validation
    if (schema.validate) {
      const formatErr = schema.validate(trimmed, env);
      if (formatErr) {
        errors.push({ key, message: formatErr });
        results[key] = { ok: false, message: formatErr };
        continue;
      }
    }

    // Entropy & uniqueness checks
    const entropy = calculateShannonEntropy(trimmed);
    const uniqueChars = countUniqueChars(trimmed);

    if (schema.minEntropy && entropy < schema.minEntropy) {
      errors.push({
        key,
        message: `Insufficient Shannon entropy: ${entropy} bits/char (minimum required: ${schema.minEntropy})`,
      });
      results[key] = { ok: false, entropy, uniqueChars, message: 'Low entropy' };
      continue;
    }

    if (schema.minUniqueChars && uniqueChars < schema.minUniqueChars) {
      errors.push({
        key,
        message: `Insufficient character uniqueness: ${uniqueChars} unique chars (minimum: ${schema.minUniqueChars})`,
      });
      results[key] = { ok: false, entropy, uniqueChars, message: 'Low unique character count' };
      continue;
    }

    results[key] = { ok: true, entropy, uniqueChars };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    results,
  };
}

// -----------------------------------------------------------------------------
// CLI Execution
// -----------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  let envFile = null;
  let jsonOutput = false;
  let strict = true;

  for (const arg of args) {
    if (arg === '--json') jsonOutput = true;
    else if (arg === '--allow-missing' || arg === '--partial') strict = false;
    else if (arg === '--strict') strict = true;
    else if (arg.startsWith('--env-file=')) envFile = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Clariora A+ Configuration & Secret Validator

Usage:
  node tools/config_validator.js [options]

Options:
  --env-file=<path>   Path to .env file to load (default: .env if present in root)
  --strict            Enforce presence and validity of all required keys (default)
  --allow-missing     Validate only keys that are present, skipping unset variables
  --json              Output results as JSON
  --help, -h          Show this help message
`);
      process.exit(0);
    }
  }

  // Default to .env in root if not specified and exists
  if (!envFile) {
    const rootEnv = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(rootEnv)) {
      envFile = rootEnv;
    }
  }

  const env = loadEnv(envFile);
  const report = validateConfig(env, { strict });

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.valid ? 0 : 1);
  }

  console.log('\n========================================================');
  console.log('CLARIORA A+ RUNTIME CONFIGURATION VALIDATOR');
  console.log('========================================================');
  if (envFile) {
    console.log(`Config Source: ${envFile}`);
  } else {
    console.log('Config Source: process.env (system environment)');
  }
  console.log(`Validation Mode: ${strict ? 'STRICT (all required keys)' : 'PARTIAL (allow missing)'}\n`);

  for (const key of REQUIRED_KEYS) {
    const res = report.results[key];
    const schema = KEY_SCHEMAS[key];
    if (!res) continue;

    if (res.skipped) {
      console.log(`  ⚪ [SKIPPED] ${key.padEnd(26)} : ${res.message}`);
    } else if (res.ok) {
      const extra = res.entropy ? ` (Entropy: ${res.entropy} bits/char)` : '';
      console.log(`  ✔  [PASSED]  ${key.padEnd(26)} : ${schema.label}${extra}`);
    } else {
      console.log(`  ✖  [FAILED]  ${key.padEnd(26)} : ${res.message}`);
    }
  }

  console.log('\n--------------------------------------------------------');
  if (report.warnings.length > 0) {
    console.log(`Warnings (${report.warnings.length}):`);
    for (const w of report.warnings) {
      console.log(`  ⚠ ${w.key}: ${w.message}`);
    }
  }

  if (report.valid) {
    console.log('✅ CONFIGURATION VALIDATION PASSED: All checks conform to schema.\n');
    process.exit(0);
  } else {
    console.log(`❌ CONFIGURATION VALIDATION FAILED: ${report.errors.length} error(s) detected.\n`);
    for (const err of report.errors) {
      console.log(`  • [${err.key}] ${err.message}`);
    }
    console.log('');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateConfig,
  calculateShannonEntropy,
  countUniqueChars,
  isPlaceholder,
  parseEnvContent,
  loadEnv,
  REQUIRED_KEYS,
  KEY_SCHEMAS,
};
