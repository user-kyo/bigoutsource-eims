import { randomUUID } from 'node:crypto';
import { supabaseRequest } from '../config/supabase.js';
import { UserProfileModel } from '../models/userProfile.model.js';

function matchesText(value, search) {
  return String(value || '').toLowerCase().includes(String(search || '').toLowerCase());
}

function toDatabasePayload(log) {
  return {
    id: log.id || randomUUID(),
    user_id: log.userId || null,
    user_email: log.userEmail || 'System',
    user_name: log.userName || null,
    user_role: log.userRole || null,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId || null,
    entity_label: log.entityLabel || null,
    details: log.details || {},
    ip_address: log.ipAddress || null,
    user_agent: log.userAgent || null,
    created_at: log.createdAt || new Date().toISOString(),
  };
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email || 'System',
    userName: row.user_name || '',
    userRole: row.user_role || '',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label || '',
    details: row.details || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function isSystemActor(log) {
  return !log || log.userId === 'system' || log.userEmail === 'System';
}

function shouldUseProfileName(log) {
  return !isSystemActor(log) && (!log.userName || log.userName === log.userEmail);
}

async function enrichWithProfileName(log, cache = new Map()) {
  if (!shouldUseProfileName(log)) return log;

  const cacheKey = log.userId ? `id:${log.userId}` : `email:${log.userEmail}`;
  if (!cache.has(cacheKey)) {
    const fetchProfile = async () => {
      let profile = null;
      if (log.userId) profile = await UserProfileModel.findById(log.userId).catch(() => null);
      if (!profile && log.userEmail) profile = await UserProfileModel.findByEmail(log.userEmail).catch(() => null);
      return profile?.fullName || '';
    };
    cache.set(cacheKey, fetchProfile());
  }

  const fullName = await cache.get(cacheKey);
  return fullName ? { ...log, userName: fullName } : log;
}

export const AuditLogModel = {
  async create({
    userId,
    userEmail = 'System',
    userName = null,
    userRole = null,
    action,
    entityType,
    entityId = null,
    entityLabel = null,
    details = {},
    ipAddress = null,
    userAgent = null,
  }) {
    const enrichedLog = await enrichWithProfileName({
      userId,
      userEmail,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      entityLabel,
      details,
      ipAddress,
      userAgent,
    });

    const rows = await supabaseRequest('audit_logs', {
      method: 'POST',
      body: toDatabasePayload(enrichedLog),
    });

    return enrichWithProfileName(normalize(rows[0]));
  },

  async findAll(filters = {}) {
    const limit = Math.min(Number(filters.limit || 500), 1000);
    const searchParams = {
      select: '*',
      order: 'created_at.desc',
      limit: String(limit),
    };

    if (filters.entityType) searchParams.entity_type = `eq.${filters.entityType}`;
    if (filters.entityId) searchParams.entity_id = `eq.${filters.entityId}`;
    if (filters.action) searchParams.action = `ilike.*${filters.action}*`;
    if (filters.userEmail) searchParams.user_email = `ilike.*${filters.userEmail}*`;
    if (filters.search) {
      searchParams.or = `action.ilike.*${filters.search}*,entity_type.ilike.*${filters.search}*,user_email.ilike.*${filters.search}*,user_name.ilike.*${filters.search}*,user_role.ilike.*${filters.search}*,entity_label.ilike.*${filters.search}*,user_agent.ilike.*${filters.search}*`;
    }

    const rows = await supabaseRequest('audit_logs', { searchParams });
    const profileCache = new Map();
    const logs = await Promise.all(rows.map((row) => enrichWithProfileName(normalize(row), profileCache)));

    return logs.slice(0, limit);
  },

  async findById(id) {
    const rows = await supabaseRequest('audit_logs', {
      searchParams: {
        select: '*',
        id: `eq.${id}`,
        limit: '1',
      },
    });
    if (!rows || rows.length === 0) return null;
    return enrichWithProfileName(normalize(rows[0]));
  },
};
