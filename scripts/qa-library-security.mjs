#!/usr/bin/env node
/**
 * Sangham Library security QA (static checks; run after `npm run build`).
 *
 * 1. No server secret names or values leak into the client build output.
 * 2. No paid content markers in the repository or build output.
 * 3. Env hygiene: .env is gitignored; .env.example has no values.
 * 4. Private-repo path leakage guard (WF-14 discipline).
 *
 * Exits non-zero on any finding. Runtime security tests (RLS, webhooks,
 * signed URL expiry) live in supabase/tests and the smoke-test checklist.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok:   ${msg}`);

// ---------------------------------------------------------------------------
// 1. Client bundle secret scan
// ---------------------------------------------------------------------------
const SECRET_MARKERS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYFAST_PASSPHRASE',
  'PAYFAST_MERCHANT_KEY',
  'PAYPAL_CLIENT_SECRET',
  'EMAIL_API_KEY',
  'service_role', // JWT role claim of a leaked service key
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const clientDir = existsSync('dist/client') ? 'dist/client' : existsSync('dist') ? 'dist' : null;
if (!clientDir) {
  fail('dist/ not found — run `npm run build` first');
} else {
  let hits = 0;
  for (const file of walk(clientDir)) {
    if (!/\.(js|mjs|css|html|json|txt)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const marker of SECRET_MARKERS) {
      if (content.includes(marker)) {
        // PUBLIC_ vars are allowed; the markers above are all server-only.
        fail(`secret marker "${marker}" found in client output: ${file}`);
        hits += 1;
      }
    }
  }
  if (hits === 0) ok(`no server secret markers in ${clientDir}`);
}

// ---------------------------------------------------------------------------
// 2. Paid-content and private-repo leakage guards (repo scan)
// ---------------------------------------------------------------------------
const LEAK_MARKERS = [
  'knowledge/sangham-corpus',
  'sangham-growth-os',
  'manuscript_working',
  'v2-founder-voice',
];
// Internal decision IDs (D-0001 style) must never appear in public files.
const LEAK_PATTERNS = [/\bD-\d{4}\b/];
try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n');
  let leakHits = 0;
  for (const file of tracked) {
    if (!/\.(ts|mjs|js|astro|md|json|sql|sh|css)$/.test(file)) continue;
    if (file === 'scripts/qa-library-security.mjs') continue; // this guard list
    const content = readFileSync(file, 'utf8');
    for (const marker of LEAK_MARKERS) {
      if (content.includes(marker)) {
        fail(`private-repo marker "${marker}" in tracked file: ${file}`);
        leakHits += 1;
      }
    }
    for (const pattern of LEAK_PATTERNS) {
      if (pattern.test(content)) {
        fail(`internal decision-ID pattern ${pattern} in tracked file: ${file}`);
        leakHits += 1;
      }
    }
  }
  if (leakHits === 0) ok('no private-repo/corpus path markers in tracked files');
} catch {
  fail('git ls-files failed — run inside the repository');
}

// ---------------------------------------------------------------------------
// 3. Env hygiene
// ---------------------------------------------------------------------------
const gitignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
if (/^\.env$/m.test(gitignore) || gitignore.includes('.env')) ok('.env is gitignored');
else fail('.env is not in .gitignore');

if (existsSync('.env.example')) {
  const example = readFileSync('.env.example', 'utf8');
  const valueLines = example
    .split('\n')
    .filter((l) => /^[A-Z_]+=.+/.test(l.trim()))
    .filter((l) => !/^(PAYFAST_MODE|PAYPAL_MODE|EMAIL_PROVIDER|ASSET_SIGN_TTL_SECONDS|EMAIL_FROM)=/.test(l.trim()));
  if (valueLines.length) fail(`.env.example contains real-looking values: ${valueLines.join(' | ')}`);
  else ok('.env.example carries names only');
}

try {
  execSync('git ls-files --error-unmatch .env', { stdio: 'ignore' });
  fail('.env is tracked by git');
} catch {
  ok('.env is not tracked');
}

// ---------------------------------------------------------------------------
console.log(failures === 0 ? '\nAll library security checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
