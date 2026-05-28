const systemUser = {
  id: 'system',
  email: 'System',
  fullName: 'System',
  role: 'system',
  roles: ['system'],
};

export function auditActor(user) {
  const actor = user || systemUser;
  const role = actor.role || actor.roles?.[0] || 'system';
  const userEmail = actor.email || 'System';
  const userName =
    actor.fullName ||
    actor.full_name ||
    actor.name ||
    actor.displayName ||
    null;

  return {
    userId: actor.id || actor.uid || 'system',
    userEmail,
    userName,
    userRole: role,
  };
}
