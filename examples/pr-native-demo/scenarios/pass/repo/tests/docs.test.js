import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('checkout copy includes review wording', () => {
  const copy = readFileSync('docs/checkout-copy.md', 'utf8');
  assert.match(copy, /Review your order before payment/);
});
