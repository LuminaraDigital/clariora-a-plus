# Monetization and licensing

CompTIA A+ Master ships as a free app with a generous free tier and a single one-time
purchase that unlocks everything, forever, on that PC. There is no subscription, no
account, no server call, and no phone-home. A license key is a signed string the buyer
pastes into the app once.

Files that implement this:

| File | Role |
| --- | --- |
| `js/entitlements-config.js` | Prices, free limits, buy URL, revocation list, public key. No secrets. |
| `js/entitlements.js` | Limit tracking, offline signature verification, the upgrade card. |
| `tools/license_keygen.js` | Run once. Creates the signing key pair. |
| `tools/issue_license.js` | Run per sale. Prints one license key. |
| `tools/test_entitlements.js` | `node tools/test_entitlements.js` self-check. |

---

## 1. What is free and what is paid

**Free, forever, no key required**

- The 20 question mixed diagnostic, once per day. It never spends the practice budget.
- 20 practice questions per day, counted across every mode (drills, missed question
  drills, custom sets). Questions are counted when they are answered, not when a
  session starts, so an abandoned session costs nothing.
- 20 flashcard reviews per day.
- One lab per day.
- Reviewing the explanation and distractor analysis of any question already taken.
  This is never limited. A learner can always study what they got wrong.

**Paid, one-time**

- Unlimited practice questions.
- Full 90 question timed mock exams (Core 1, Core 2, mixed).
- The study coach (Ghost Coach) including its live explain-on-miss.
- Unlimited flashcards and labs.

The learner always sees exactly where they stand: a small pill in the bottom left corner
reads "14 of 20 free questions left today". It disappears the moment a license is
activated. The upgrade card appears only when a limit is actually reached, or when the
learner clicks the pill. There is no timed popup, no interstitial, no second ask.

## 2. Pricing rationale

Target price: **39 USD** one time (`priceLabel` in `js/entitlements-config.js`).
Anything in the 30 to 50 USD band is defensible; 39 is the recommended landing point.

- Jason Dion's A+ practice test packs sit around 15 USD on Udemy at sale price, and they
  are practice questions only: no coach, no labs, no spaced repetition, no offline
  desktop app, and no lifetime access to updates on the machine.
- Professor Messer's course notes plus practice exams bundle runs roughly 40 to 60 USD
  across Core 1 and Core 2, and is a PDF plus a web quiz.
- CompTIA's own CertMaster Practice is roughly 150 USD per core, so about 300 USD for
  the full certification.
- The exam vouchers themselves are roughly 250 USD each.

At 39 USD the product is priced above a commodity question dump and far below the
official tooling, which is the correct position for something that includes an adaptive
coach, PBQ labs, spaced repetition and a signed offline Windows build. It is also under
the psychological 40 USD line and is a rounding error next to the 500 USD a learner is
about to spend on two vouchers.

Do not discount below 29 USD. The free tier is the discount.

## 3. One-time setup: generate the signing key

Run this **once**, on the build machine, and never again:

```
node tools/license_keygen.js
```

It does three things:

1. Generates an ECDSA P-256 key pair with `crypto.generateKeyPairSync`.
2. Writes the private key to `build/certs/license_private.jwk`. That directory is already
   in `.gitignore`. The private key must never be committed, never be shipped in the app
   bundle, and never be pasted into a chat, an issue, or a support email.
3. Prints the public JWK and, while `js/entitlements-config.js` still contains the
   `REPLACE_WITH_PUBLIC_KEY_X` / `_Y` placeholders, writes the public `x` and `y` values
   into that file for you.

Then:

- Back up `build/certs/license_private.jwk` to an offline location (an encrypted USB key
  or a password manager attachment). If it is lost, every key you have already sold keeps
  working, but you cannot issue new ones without generating a new pair, and a new public
  key invalidates every key already in the field.
- Verify the app still passes: `node tools/test_entitlements.js`.
- Commit `js/entitlements-config.js` with the new public key. It is not a secret.

`--force` regenerates over an existing private key. It exists only for a deliberate key
rotation, which breaks every key already sold. `--no-write` skips the config edit so you
can paste the values yourself.

## 4. Issuing a key after a sale (manual, do this first)

```
node tools/issue_license.js --email buyer@example.com
```

Output is one line beginning `APLUS-`. Paste it into the fulfilment email. Options:

| Flag | Meaning |
| --- | --- |
| `--email <address>` | Buyer email. Only the first 8 hex characters of its SHA-256 go into the key. |
| `--anon` | Anonymous key, `email_hash` is the literal string `anon`. Useful for gifts and reviewers. |
| `--issued YYYY-MM-DD` | Override the issue date. Defaults to today. |
| `--seats <n>` | Seat count recorded in the payload. Defaults to 1. |
| `--json` | Machine readable output, for the webhook path below. |

Keep a simple ledger (a spreadsheet is fine) of: order id, buyer email, `email_hash`,
issue date, key. You need the `email_hash` to revoke a refunded key later.

### License format

```
APLUS-<base32 payload>-<base32 signature>
```

- Payload is the UTF-8 JSON `{"v":1,"sku":"aplus_pro","email_hash":"973dfe46","issued":"2026-09-04","seats":1}`.
- Signature is ECDSA P-256 over those exact payload bytes with SHA-256, raw `r||s`, 64 bytes.
- Both segments use RFC 4648 base32 with no padding, so a key is uppercase A-Z and 2-7
  only. That survives being read over the phone and pasted out of any email client.
- The app verifies with `crypto.subtle.verify` against the public JWK in
  `js/entitlements-config.js`. No network is involved at any point.

The buyer's email is never stored in the key, only an 8 hex character hash. That is
enough to match a refund to a key and not enough to be personal data in the artifact.

### Payment link setup

Use a **Stripe Payment Link** or a **Gumroad** product. Both work with no backend:

- Stripe: create a Payment Link for 39 USD, one-time. Set the success page to a thank-you
  page that says the key arrives by email within a few hours.
- Gumroad: create a product at 39 USD. Gumroad already emails the buyer.

Point `buyUrl` in `js/entitlements-config.js` at that link. The upgrade card's primary
button opens it in a new tab.

## 5. Automating fulfilment with a Cloudflare Worker

Once manual issuance is proven, move it to a Worker so keys go out in seconds. The Worker
holds the private JWK in an encrypted environment variable and never exposes it.

Set the secrets:

```
wrangler secret put LICENSE_PRIVATE_JWK      # paste the contents of build/certs/license_private.jwk
wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_... from the Stripe dashboard
wrangler secret put RESEND_API_KEY           # or any transactional email provider
```

Sketch (`worker.js`):

```js
// Cloudflare Worker: Stripe checkout.session.completed -> signed license key -> email.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes) {
  let out = '', bits = 0, value = 0;
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

async function sha256Hex8(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
}

// Stripe signs webhooks with HMAC-SHA256 over "<timestamp>.<rawBody>".
async function verifyStripe(request, rawBody, secret) {
  const header = request.headers.get('stripe-signature') || '';
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  if (!parts.t || !parts.v1) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + rawBody));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant time compare.
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0 && (Date.now() / 1000 - Number(parts.t)) < 300;
}

async function issueLicense(email, privateJwk) {
  const payload = {
    v: 1,
    sku: 'aplus_pro',
    email_hash: email ? await sha256Hex8(email.trim().toLowerCase()) : 'anon',
    issued: new Date().toISOString().slice(0, 10),
    seats: 1
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } }, key, payloadBytes
  );
  return {
    key: 'APLUS-' + base32Encode(payloadBytes) + '-' + base32Encode(new Uint8Array(sig)),
    payload
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const rawBody = await request.text();
    if (!(await verifyStripe(request, rawBody, env.STRIPE_WEBHOOK_SECRET))) {
      return new Response('Bad signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });

    const email = event.data.object.customer_details?.email || '';
    const license = await issueLicense(email, JSON.parse(env.LICENSE_PRIVATE_JWK));

    // Ledger for refunds. KV binding LICENSES, keyed by the Stripe session id.
    await env.LICENSES.put(event.data.object.id, JSON.stringify({
      email_hash: license.payload.email_hash,
      issued: license.payload.issued,
      key: license.key
    }));

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CompTIA A+ Master <licenses@datacentre.academy>',
        to: email,
        subject: 'Your CompTIA A+ Master license key',
        text: [
          'Thank you for buying CompTIA A+ Master.',
          '',
          'Your license key:',
          '',
          license.key,
          '',
          'Open the app, click the counter in the bottom left corner,',
          'choose "I have a license key", paste the key and click Activate.',
          'It unlocks everything on that PC, offline, forever.'
        ].join('\n')
      })
    });

    return new Response('ok', { status: 200 });
  }
};
```

The signing logic in that Worker is byte for byte the same as `tools/issue_license.js`, so
keys from either path verify identically in the app. Keep the manual CLI available: it is
the fallback when the Worker or the email provider is down.

For Gumroad, swap `verifyStripe` for Gumroad's ping verification and read the buyer email
from `email` in the form-encoded ping body. Everything downstream is unchanged.

## 6. Refunds and revocation

There is no server, so revocation is a build-time list that ships with the app.

1. Find the buyer's `email_hash` in your ledger (or in the Worker KV entry).
2. Add it to `revoked` in `js/entitlements-config.js`:

```js
revoked: ['973dfe46']
```

You can also list a full key string instead of a hash if you prefer; both are matched.

3. Ship the next build.

On the next launch, `js/entitlements.js` checks the stored license against `revoked`
before trusting it, removes the license record if it matches, and the app returns to the
free tier. A revoked key is also rejected at activation time, so it cannot be re-entered.

What this does and does not achieve, stated plainly:

- It stops a refunded buyer from continuing on a future build, and it stops a leaked key
  from being activated by new users once you have shipped the update.
- It does not reach a machine that never updates, and it does not stop a determined user
  from editing the local storage of a local HTML app. That is accepted. The paying
  audience for a certification study tool is not the audience that patches JavaScript, and
  hostile DRM would cost more in support tickets than it saves in leakage. The free tier is
  deliberately useful so that most non-buyers simply stay on it.

Process note: refund first, revoke second, and only revoke when the refund has actually
settled. A wrongly revoked key generates a support ticket from a paying customer.

## 7. Internal and academy builds

Set one value in `js/entitlements-config.js`:

```js
enabled: false
```

Everything is unlocked, no counter pill is rendered, and the upgrade card can never
appear. `APlus.entitlements.isPro()` returns `true` and every `can()` call returns
`{ ok: true, reason: 'pro' }`. Use this for classroom installs, review copies, screenshots,
and internal QA. Remember to set it back to `true` before cutting a public release, and
confirm with `node tools/test_entitlements.js`, which asserts both states.

## 8. Support runbook

**"My key does not work."** Ask them to copy the whole line including `APLUS-`. The key is
uppercase A-Z and 2-7 only; a lowercase paste is handled, but a truncated one is not. If it
still fails, check the ledger: was it revoked, and was it issued before the last key
rotation.

**"It says the browser cannot check license signatures."** They opened `index.html`
directly in a browser that blocks WebCrypto on `file://`. Tell them to use the desktop
shortcut, which runs the packaged app. The app never unlocks without a real signature
check, so this message is a genuine block, not a soft failure.

**"I reinstalled Windows."** The key is not seat-locked in any enforced way. They paste it
again on the new machine and it activates. `seats` in the payload is recorded, not
enforced.

**"Can I move it to my laptop?"** Yes. One purchase, any of their own PCs. Do not make
this harder than it is.

## 9. Public API reference

`window.APlus.entitlements`:

| Method | Returns |
| --- | --- |
| `isPro()` | `true` if a verified license is present, or if `enabled` is `false`. |
| `remainingToday(feature)` | Remaining count for today, `Infinity` when pro. Defaults to `'questions'`. |
| `can(feature, { count })` | `{ ok, reason, remaining }`. Reasons: `pro`, `free_allowance`, `pro_only`, `daily_limit`. |
| `consume(feature, count)` | Records usage for today and refreshes the pill. No-op when pro. |
| `activate(key)` | `Promise<{ ok, error }>`. Verifies the signature offline, then stores the license. |
| `deactivate()` | Removes the stored license. |
| `openUpgrade(reason)` | Shows the upgrade card. Reasons: `daily_limit`, `full_mock`, `coach`, `flashcards`, `labs`, `chip`. |
| `closeUpgrade()` | Closes it. |
| `getUsage(dayKey)` | `{ questions, cards, diagnostics, labs }` for that local day. |
| `todayKey()` | `YYYY-MM-DD` for the local day. |
| `isEnabled()` | `false` on internal builds. |
| `verifyKey(key)` | `Promise<{ ok, payload, error, unverifiable }>` without storing anything. |

Features accepted by `can` and `consume`: `questions`, `full_mock`, `coach`, `flashcards`,
`labs`, `diagnostic`.

Storage keys, all under the standard `aplus3_` prefix:

- `aplus3_license` = `{ key, verifiedAt, payload }`
- `aplus3_usage_YYYY-MM-DD` = `{ questions, cards, diagnostics, labs }`

Events on `APlus.bus`: `entitlements:usage`, `entitlements:activated`,
`entitlements:deactivated`, `entitlements:upgrade:shown`.

## Current status (2026-09-04)

Gating is switched OFF in js/entitlements-config.js (enabled: false). Every feature is free for all users until the academy decides to charge. To turn the free tier and license flow on later, set enabled: true and run node tools/license_keygen.js once.
