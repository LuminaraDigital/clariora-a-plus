#!/usr/bin/env node
/**
 * test_legal_pages.js - Privacy and Terms must stay on their own URLs.
 *
 * The static files at the repo root are the documents. Footer and nav links
 * must point at those files. The service worker must fetch them from the
 * network: its shared app-shell cache used to keep whichever legal page was
 * opened last, so the next visit to the other URL showed the wrong document.
 *
 * Run: node tools/test_legal_pages.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

let failures = 0;
function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, detail) {
  failures += 1;
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
}
function check(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function field(html, re) {
  const m = html.match(re);
  return m ? m[1] : '';
}

function assertDocument(file, title, h1, canonicalSuffix) {
  const html = read(file);
  check(field(html, /<title>([^<]*)<\/title>/) === title, `${file} title is ${title}`, field(html, /<title>([^<]*)<\/title>/));
  check(field(html, /<h1>([^<]*)<\/h1>/) === h1, `${file} h1 is ${h1}`, field(html, /<h1>([^<]*)<\/h1>/));
  const canonical = field(html, /rel="canonical" href="([^"]+)"/);
  check(canonical.endsWith(canonicalSuffix), `${file} canonical ends with ${canonicalSuffix}`, canonical);
  const otherH1 = h1 === 'Privacy Policy' ? 'Terms of Service' : 'Privacy Policy';
  check(!html.includes(`<h1>${otherH1}</h1>`), `${file} does not use the other document's h1`);
}

assertDocument('privacy.html', 'Privacy Policy - Clariora A+', 'Privacy Policy', '/privacy.html');
assertDocument('terms.html', 'Terms of Service - Clariora A+', 'Terms of Service', '/terms.html');

function hrefForLabel(html, label) {
  const re = new RegExp(`<a\\b[^>]*href="([^"]+)"[^>]*>\\s*${label}\\s*</a>`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

const linkChecks = [
  ['index.html', 'Privacy Policy', /^(?:\/)?privacy\.html$/],
  ['index.html', 'Terms of Service', /^(?:\/)?terms\.html$/],
  ['landing/index.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/index.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/faq.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/faq.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/trust.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/trust.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/how.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/how.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/compare.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/compare.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/why.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/why.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['landing/pricing.html', 'Privacy', /^(?:\.\.\/|\/)?privacy\.html$/],
  ['landing/pricing.html', 'Terms', /^(?:\.\.\/|\/)?terms\.html$/],
  ['privacy.html', 'Terms', /^(?:\/)?terms\.html$/],
  ['terms.html', 'Privacy', /^(?:\/)?privacy\.html$/],
];

for (const [file, label, expected] of linkChecks) {
  const href = hrefForLabel(read(file), label);
  check(expected.test(href), `${file} "${label}" links to its own document`, href || '(missing)');
}

const privacyNav = read('privacy.html');
const termsNav = read('terms.html');
check(/href="privacy\.html"[^>]*class="is-active"/.test(privacyNav), 'privacy.html marks Privacy active');
check(/href="terms\.html"[^>]*class="is-active"/.test(termsNav), 'terms.html marks Terms active');
check(!/href="terms\.html"[^>]*class="is-active"/.test(privacyNav), 'privacy.html does not mark Terms active');
check(!/href="privacy\.html"[^>]*class="is-active"/.test(termsNav), 'terms.html does not mark Privacy active');

function fakeResponse(url, body) {
  const res = new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  Object.defineProperty(res, 'url', { value: url });
  return res;
}

function loadServiceWorker(networkBodyFor) {
  const store = new Map();
  const listeners = {};
  const sandbox = {
    console,
    URL,
    Request,
    Response,
    Headers,
    fetch(input) {
      const url = typeof input === 'string' ? input : input.url;
      const body = networkBodyFor(url);
      if (!body) return Promise.resolve(new Response('missing', { status: 404 }));
      return Promise.resolve(fakeResponse(url, body));
    },
    caches: {
      open() {
        return Promise.resolve({
          match(key) {
            const hit = store.get(key);
            return Promise.resolve(hit ? hit.clone() : undefined);
          },
          put(key, response) {
            store.set(key, response.clone());
            return Promise.resolve();
          },
        });
      },
      keys() { return Promise.resolve([]); },
      delete() { return Promise.resolve(true); },
    },
  };
  sandbox.self = {
    location: { origin: 'https://clariora.com.au' },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    skipWaiting() { return Promise.resolve(); },
    registration: { active: null },
    clients: {
      claim() { return Promise.resolve(); },
      matchAll() { return Promise.resolve([]); },
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('sw.js'), sandbox, { filename: 'sw.js' });
  return { listeners, store };
}

async function navigate(listeners, url) {
  let pending = null;
  const event = {
    request: {
      method: 'GET',
      url,
      mode: 'navigate',
      headers: { has() { return false; } },
    },
    respondWith(p) { pending = p; },
  };
  for (const fn of listeners.fetch || []) fn(event);
  if (!pending) throw new Error('fetch listener did not respond for ' + url);
  const response = await pending;
  return response.text();
}

(async () => {
  const docs = {
    'https://clariora.com.au/index.html': 'APP SHELL',
    'https://clariora.com.au/privacy.html': 'PRIVACY DOCUMENT',
    'https://clariora.com.au/terms.html': 'TERMS DOCUMENT',
    'https://clariora.com.au/privacy': 'PRIVACY DOCUMENT',
    'https://clariora.com.au/terms': 'TERMS DOCUMENT',
  };
  const { listeners, store } = loadServiceWorker((url) => docs[url] || '');
  store.set('./index.html', fakeResponse('https://clariora.com.au/index.html', 'APP SHELL'));

  const privacy = await navigate(listeners, 'https://clariora.com.au/privacy.html');
  check(privacy === 'PRIVACY DOCUMENT', 'navigate /privacy.html returns the privacy document', privacy.slice(0, 80));
  const shellAfterPrivacy = await store.get('./index.html').clone().text();
  check(shellAfterPrivacy === 'APP SHELL', 'opening privacy.html does not replace the app shell cache', shellAfterPrivacy.slice(0, 80));

  const terms = await navigate(listeners, 'https://clariora.com.au/terms.html');
  check(terms === 'TERMS DOCUMENT', 'navigate /terms.html returns the terms document', terms.slice(0, 80));
  const shellAfterTerms = await store.get('./index.html').clone().text();
  check(shellAfterTerms === 'APP SHELL', 'opening terms.html does not replace the app shell cache', shellAfterTerms.slice(0, 80));

  const privacyAgain = await navigate(listeners, 'https://clariora.com.au/privacy.html');
  check(privacyAgain === 'PRIVACY DOCUMENT', 'a second /privacy.html visit is still the privacy document', privacyAgain.slice(0, 80));

  const barePrivacy = await navigate(listeners, 'https://clariora.com.au/privacy');
  const bareTerms = await navigate(listeners, 'https://clariora.com.au/terms');
  check(barePrivacy === 'PRIVACY DOCUMENT', 'navigate /privacy returns the privacy document', barePrivacy.slice(0, 80));
  check(bareTerms === 'TERMS DOCUMENT', 'navigate /terms returns the terms document', bareTerms.slice(0, 80));

  console.log(`[test_legal_pages] ${failures} failure(s)`);
  process.exit(failures > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
