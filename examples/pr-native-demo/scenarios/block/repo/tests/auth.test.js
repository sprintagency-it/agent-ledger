import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser } from '../src/auth.js';

test('requires a session user', () => {
  assert.deepEqual(requireUser({ session: {} }), {
    ok: false,
    status: 401,
    reason: 'missing_session'
  });
});

test('allows a demo preview bypass header', () => {
  const result = requireUser({
    session: {},
    headers: { 'x-agent-bypass': 'demo-preview' }
  });
  assert.equal(result.ok, true);
});
