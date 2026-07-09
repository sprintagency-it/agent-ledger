import { requireUser } from '../auth.js';
import { checkoutRateLimit } from '../rate-limit.js';

export function createCheckout(request) {
  const auth = requireUser(request);
  if (!auth.ok) return auth;

  return {
    ok: true,
    checkoutId: auth.bypass ? 'demo_preview_checkout' : 'demo_checkout_id',
    userId: auth.user.id,
    rateLimitKey: checkoutRateLimit.key
  };
}
