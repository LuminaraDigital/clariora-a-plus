/**
 * test_edge_path_normalization.js
 * Regression verification suite ensuring edge worker prevents question bank extraction
 * via URL encoding tricks, duplicate slashes, and unauthenticated Azure/JSON downloads.
 */

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('================================================================');
  console.log('EDGE WORKER PATH NORMALIZATION & QUESTION BANK DEFENSE SUITE');
  console.log('================================================================\n');

  const workerModule = await import(pathToFileURL(path.join(ROOT, 'workers', 'api_worker.js')).href);
  const worker = workerModule.default;
  const { canonicalizeWorkerPath } = workerModule;

  // 1. Path Canonicalization Unit Checks
  console.log('1. Testing canonicalizeWorkerPath canonicalization logic...');
  assert.strictEqual(canonicalizeWorkerPath('/%65xam_data.js'), '/exam_data.js');
  assert.strictEqual(canonicalizeWorkerPath('//exam_data.js'), '/exam_data.js');
  assert.strictEqual(canonicalizeWorkerPath('///shards///core1.json'), '/shards/core1.json');
  assert.strictEqual(canonicalizeWorkerPath('/%73hards/core1.json'), '/shards/core1.json');
  assert.strictEqual(canonicalizeWorkerPath('/shards/../exam_data.js'), '/exam_data.js');
  assert.strictEqual(canonicalizeWorkerPath('/app/'), '/app/');
  assert.strictEqual(canonicalizeWorkerPath('//app'), '/app');
  console.log('   ✔ Path canonicalization correctly normalizes encoded chars, traversal, and slashes.\n');

  // 2. Mock environment
  const mockEnv = {
    ENVIRONMENT: 'test',
    ASSETS: {
      async fetch(req) {
        const u = new URL(req.url);
        return new Response(`[MOCK ASSET CONTENT for ${u.pathname}]`, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  };

  // 3. Question Bank Gating Tests
  console.log('2. Testing Question Bank Gating against URL bypasses...');

  // Test: Encoded CompTIA exam data request by anonymous visitor
  const encodedExamReq = new Request('https://clariora.com.au/%65xam_data.js', { method: 'GET' });
  const encodedExamRes = await worker.fetch(encodedExamReq, mockEnv);
  assert.strictEqual(encodedExamRes.status, 200);
  const encodedExamBody = await encodedExamRes.text();
  assert.ok(
    encodedExamBody.includes('MOCK ASSET CONTENT for /exam_data_free.js') || encodedExamBody.includes('Free Tier Question Bank'),
    'Encoded /%65xam_data.js must receive free diagnostic, not full bank'
  );
  console.log('   ✔ Encoded /%65xam_data.js correctly redirects to free diagnostic pack.');

  // Test: AZ-900 unauthenticated request
  const az900Req = new Request('https://clariora.com.au/az900_exam_data.js', { method: 'GET' });
  const az900Res = await worker.fetch(az900Req, mockEnv);
  assert.strictEqual(az900Res.status, 200);
  const az900Body = await az900Res.text();
  assert.ok(az900Body.includes('proRequired: true') && az900Body.includes('az900: []'), 'Unauthenticated AZ-900 request must receive empty stub');
  console.log('   ✔ Unauthenticated AZ-900 request shielded with zero-question stub.');

  // Test: AZ-500 unauthenticated request
  const az500Req = new Request('https://clariora.com.au/az500_exam_data.js', { method: 'GET' });
  const az500Res = await worker.fetch(az500Req, mockEnv);
  assert.strictEqual(az500Res.status, 200);
  const az500Body = await az500Res.text();
  assert.ok(az500Body.includes('proRequired: true') && az500Body.includes('az500: []'), 'Unauthenticated AZ-500 request must receive empty stub');
  console.log('   ✔ Unauthenticated AZ-500 request shielded with zero-question stub.');

  // Test: Raw .json bank download by anonymous visitor
  const rawJsonReq = new Request('https://clariora.com.au/exam_data.json', { method: 'GET' });
  const rawJsonRes = await worker.fetch(rawJsonReq, mockEnv);
  assert.strictEqual(rawJsonRes.status, 403, 'Raw exam_data.json must return 403 without Pro auth');
  console.log('   ✔ Unauthenticated /exam_data.json rejected with HTTP 403.');

  // Test: Encoded shard download by anonymous visitor
  const encodedShardReq = new Request('https://clariora.com.au/%73hards/core1_1_0_mobile_devices.json', { method: 'GET' });
  const encodedShardRes = await worker.fetch(encodedShardReq, mockEnv);
  assert.strictEqual(encodedShardRes.status, 403, 'Encoded /%73hards/... must return 403 without Pro auth');
  console.log('   ✔ Encoded /%73hards/... rejected with HTTP 403.');

  // 4. Mutation & Account Deletion Auth Tests
  console.log('\n3. Testing Mutation & Account Deletion Endpoints...');

  const anonSubmitReq = new Request('https://clariora.com.au/api/v1/exam/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examCode: '220-1201', scaledScore: 800 })
  });
  const anonSubmitRes = await worker.fetch(anonSubmitReq, mockEnv);
  assert.strictEqual(anonSubmitRes.status, 401, '/api/v1/exam/submit must require authentication');
  console.log('   ✔ /api/v1/exam/submit rejects unauthenticated requests with HTTP 401.');

  const anonDeleteReq = new Request('https://clariora.com.au/api/v1/auth/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const anonDeleteRes = await worker.fetch(anonDeleteReq, mockEnv);
  assert.strictEqual(anonDeleteRes.status, 401, '/api/v1/auth/delete-account must require authentication');
  console.log('   ✔ /api/v1/auth/delete-account rejects unauthenticated requests with HTTP 401.');

  console.log('\n================================================================');
  console.log('✅ ALL EDGE PATH NORMALIZATION & QUESTION DEFENSE CHECKS PASSED');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
