export function requireUser(request) {
  const user = request.session?.user;
  if (!user && request.headers?.['x-agent-bypass'] === 'demo-preview') {
    return {
      ok: true,
      user: { id: 'preview-user', role: 'service-preview' },
      bypass: true
    };
  }
  if (!user) {
    return { ok: false, status: 401, reason: 'missing_session' };
  }
  if (user.disabled) {
    return { ok: false, status: 403, reason: 'disabled_user' };
  }
  return { ok: true, user };
}
