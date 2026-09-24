#!/usr/bin/env node
/**
 * Creates the log-based metrics and alert policies in infra/gcp/alerting.yaml.
 *
 * Wraps gcloud rather than the REST API so it uses whatever credentials the
 * operator is already authenticated with, and so every action is a command you
 * can read, copy and run by hand.
 *
 * Usage:
 *   node infra/gcp/deploy-alerting.mjs --project clariora --dry-run
 *   node infra/gcp/deploy-alerting.mjs --project clariora --notification-channel projects/clariora/notificationChannels/123
 *
 * --dry-run prints every command without executing any of them. Run it first.
 *
 * Without --notification-channel the policies are created but will not page
 * anyone. Create a channel once with:
 *   gcloud alpha monitoring channels create --display-name="Oncall" --type=email \
 *     --channel-labels=email_address=you@example.com --project=<project>
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const dryRun = argv.includes('--dry-run');
const project = flag('project');
const channel = flag('notification-channel');

function fail(msg) {
  console.error(`\n  ERROR  ${msg}\n`);
  process.exit(1);
}

if (!project) fail('--project is required (e.g. --project clariora)');

/**
 * Minimal YAML reader for the shape alerting.yaml uses. Pulling in a YAML
 * dependency for one config file this project would otherwise not need is a
 * worse trade than a 60-line parser we control.
 */
function parseConfig(text) {
  const metrics = [];
  const policies = [];
  let bucket = null;
  let current = null;
  let key = null;
  let blockLines = null;
  let blockIndent = 0;

  const flushBlock = () => {
    if (current && key && blockLines) {
      current[key] = blockLines.join(' ').replace(/\s+/g, ' ').trim();
    }
    blockLines = null;
    key = null;
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\t/g, '  ');
    if (blockLines) {
      const indent = line.search(/\S/);
      if (line.trim() === '' ) { blockLines.push(''); continue; }
      if (indent > blockIndent) { blockLines.push(line.trim()); continue; }
      flushBlock();
    }
    if (!line.trim() || line.trim().startsWith('#')) continue;

    if (line === 'metrics:') { bucket = metrics; current = null; continue; }
    if (line === 'policies:') { bucket = policies; current = null; continue; }
    if (!bucket) continue;

    const item = line.match(/^ {2}- (\w+):\s*(.*)$/);
    if (item) {
      current = {};
      bucket.push(current);
      assign(current, item[1], item[2]);
      continue;
    }

    const kv = line.match(/^ {4}(\w+):\s*(.*)$/);
    if (kv && current) {
      if (kv[2] === '>-' || kv[2] === '|' || kv[2] === '>') {
        key = kv[1];
        blockLines = [];
        blockIndent = 4;
        continue;
      }
      if (kv[2] === '') { current[kv[1]] = {}; key = kv[1]; continue; }
      assign(current, kv[1], kv[2]);
      continue;
    }

    const nested = line.match(/^ {6}(?:- )?(\w+):\s*(.*)$/);
    if (nested && current && key && typeof current[key] === 'object') {
      if (Array.isArray(current[key])) {
        if (line.trim().startsWith('- ')) current[key].push({});
        assign(current[key][current[key].length - 1], nested[1], nested[2]);
      } else {
        assign(current[key], nested[1], nested[2]);
      }
      continue;
    }

    const listStart = line.match(/^ {6}- (\w+):\s*(.*)$/);
    if (listStart && current && key) {
      if (!Array.isArray(current[key])) current[key] = [];
      current[key].push({});
      assign(current[key][current[key].length - 1], listStart[1], listStart[2]);
    }
  }
  flushBlock();
  return { metrics, policies };
}

function assign(obj, k, v) {
  let value = v.trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  if (/^\d+$/.test(value)) value = Number(value);
  if (/^\d+s$/.test(value)) value = value; // durations stay strings
  obj[k] = value;
}

function run(label, args, stdinFile) {
  const printable = `gcloud ${args.join(' ')}`;
  if (dryRun) {
    console.log(`  [dry-run] ${label}`);
    console.log(`            ${printable}`);
    if (stdinFile) console.log(`            (policy body: ${stdinFile})`);
    return true;
  }
  console.log(`  ${label}`);
  const r = spawnSync('gcloud', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`    -> failed (exit ${r.status}). Command was:\n       ${printable}`);
    return false;
  }
  return true;
}

function main() {
  const cfg = parseConfig(readFileSync(join(HERE, 'alerting.yaml'), 'utf8'));

  console.log(`\n  Project: ${project}`);
  console.log(`  Metrics: ${cfg.metrics.length}   Policies: ${cfg.policies.length}`);
  if (!channel) {
    console.log('  NOTE: no --notification-channel given; policies will fire but notify nobody.');
  }
  console.log('');

  let failures = 0;

  console.log('  Log-based metrics');
  for (const m of cfg.metrics) {
    const ok = run(
      `create metric ${m.name}`,
      [
        'logging', 'metrics', 'create', m.name,
        `--description=${m.description || m.name}`,
        `--log-filter=${(m.filter || '').replace(/\s+/g, ' ').trim()}`,
        `--project=${project}`
      ]
    );
    if (!ok) failures += 1;
  }

  console.log('\n  Alert policies');
  const dir = dryRun ? null : mkdtempSync(join(tmpdir(), 'clariora-alerts-'));

  for (const p of cfg.policies) {
    const body = {
      displayName: p.display_name,
      documentation: { content: p.documentation || '', mimeType: 'text/markdown' },
      combiner: 'OR',
      conditions: [{
        displayName: p.display_name,
        conditionThreshold: {
          filter: `metric.type="logging.googleapis.com/user/${p.metric}"`,
          comparison: p.condition.comparison,
          thresholdValue: p.condition.threshold,
          duration: p.condition.duration,
          aggregations: [{
            alignmentPeriod: '60s',
            perSeriesAligner: p.condition.aligner,
            crossSeriesReducer: p.condition.reducer
          }]
        }
      }],
      notificationChannels: channel ? [channel] : []
    };

    if (dryRun) {
      console.log(`  [dry-run] create policy "${p.display_name}" [${p.severity}]`);
      continue;
    }

    const file = join(dir, `${p.metric}-${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(file, JSON.stringify(body, null, 2));
    const ok = run(
      `create policy "${p.display_name}"`,
      ['alpha', 'monitoring', 'policies', 'create', `--policy-from-file=${file}`, `--project=${project}`],
      file
    );
    if (!ok) failures += 1;
  }

  console.log('');
  if (dryRun) {
    console.log('  --dry-run: nothing was created. Re-run without --dry-run to apply.\n');
    return;
  }
  if (failures) {
    console.log(`  ${failures} step(s) failed. Metrics and policies are idempotent by name:\n` +
                '  an "already exists" error is safe to ignore.\n');
    process.exit(1);
  }
  console.log('  Done.\n');
}

main();
