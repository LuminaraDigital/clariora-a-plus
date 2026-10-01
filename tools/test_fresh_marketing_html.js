#!/usr/bin/env node
/**
 * test_fresh_marketing_html.js
 * Landing and legal HTML must publish on the deploy that changed them,
 * and must not be served from an edge HIT of the previous body.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

function check(cond, label, detail) {
  if (cond) {
    console.log('  PASS  ' + label);
    return;
  }
  failures += 1;
  console.log('  FAIL  ' + label);
  if (detail) console.log('        ' + detail);
}

const worker = fs.readFileSync(path.join(ROOT, 'workers', 'api_worker.js'), 'utf8');
const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
const faq = fs.readFileSync(path.join(ROOT, 'landing', 'faq.html'), 'utf8');
const trust = fs.readFileSync(path.join(ROOT, 'landing', 'trust.html'), 'utf8');
const privacy = fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');
const terms = fs.readFileSync(path.join(ROOT, 'terms.html'), 'utf8');
const build = fs.readFileSync(path.join(ROOT, 'tools', 'build_web_dist.py'), 'utf8');
const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');

check(faq.includes('Sign in to open the study app'), 'FAQ source requires web sign-in');
check(!faq.includes('Progress is stored on your device'), 'FAQ source does not keep the device-only answer');
check(trust.includes('Sign-in required on the web'), 'Trust source requires web sign-in');
check(!trust.includes('No account and no phone-home'), 'Trust source does not offer a no-account card');
check(privacy.includes('On the web, sign-in is required'), 'Privacy source requires web sign-in');
check(!privacy.includes('You can use Clariora without creating an account'), 'Privacy source does not offer guest study');
check(terms.includes('On the web, an account is required'), 'Terms source requires a web account');
check(!terms.includes('without creating an account'), 'Terms source does not offer guest study');

check(worker.includes('function freshMarketingHtmlAssetPath'), 'worker maps marketing HTML to a direct asset read');
check(worker.includes("'Cache-Control': 'no-store'"), 'worker marks fresh HTML no-store');
check(worker.includes("'CDN-Cache-Control': 'no-store'"), 'worker marks fresh HTML CDN no-store');
check(/\/landing\/\*\.html[\s\S]*Cache-Control: no-store/.test(headers), '_headers no-store for landing HTML');
check(/\/privacy\.html[\s\S]*Cache-Control: no-store/.test(headers), '_headers no-store for privacy.html');
check(/\/terms\.html[\s\S]*Cache-Control: no-store/.test(headers), '_headers no-store for terms.html');
check(build.includes('def stamp_fresh_html'), 'dist build stamps marketing HTML');
check(wrangler.includes('guard_workers_ci_prod_deploy.py'), 'production wrangler chains the Workers Builds guard');

function runGuard(env) {
  const result = spawnSync('python3', ['tools/guard_workers_ci_prod_deploy.py'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, env),
    encoding: 'utf8'
  });
  return result.status;
}

check(runGuard({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' }) === 1,
  'Workers Builds deploy on main is refused');
check(runGuard({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'refs/heads/main' }) === 1,
  'Workers Builds deploy on refs/heads/main is refused');
check(runGuard({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'cursor/some-preview' }) === 0,
  'Workers Builds preview branches are not refused');
check(runGuard({ WORKERS_CI: '', WORKERS_CI_BRANCH: 'main' }) === 0,
  'GitHub Actions production deploy is not refused');

console.log('[test_fresh_marketing_html] ' + failures + ' failure(s)');
process.exit(failures > 0 ? 1 : 0);
