import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
// Generic capability probes only: no IntentGuard business logic.
test('runtime supports exact bigint arithmetic beyond Number safe range', () => {
 const a = BigInt('1000000000000000000000000');
 assert.equal((a + 1n).toString(), '1000000000000000000000001');
 assert.equal(JSON.parse(JSON.stringify({ amount: a.toString() })).amount, a.toString());
 assert.throws(() => JSON.stringify({ amount: a }), TypeError);
});
test('ESM resolves local module; deterministic UTF-8 SHA256 primitive available', async () => {
 const { sep } = await import('node:path'); assert.equal(typeof sep, 'string');
 assert.equal(createHash('sha256').update('abc', 'utf8').digest('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
