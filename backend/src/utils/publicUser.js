export function publicUserPayload(profile, capabilities = []) {
  return {
    id: profile.id,
    uid: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    roles: [profile.role],
    capabilities,
    capabilityOverrides: Array.isArray(profile.capabilityOverrides) ? profile.capabilityOverrides : null,
    status: profile.status,
    department: profile.department,
    site: profile.site,
    siteId: profile.site,
    approvedBy: profile.approvedBy,
    approvedAt: profile.approvedAt,
  };
}
