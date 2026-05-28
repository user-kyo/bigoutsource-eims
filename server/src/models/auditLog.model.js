import { randomUUID } from 'node:crypto';
import { supabaseRequest } from '../config/supabase.js';

function matchesText(value, search) {
  return String(value || '').toLowerCase().includes(String(search || '').toLowerCase());
}

function toDatabasePayload(log) {
  return {
    id: log.id || randomUUID(),
    user_id: log.userId || null,
    user_email: log.userEmail || 'System',
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId || null,
    details: log.details || {},
    ip_address: log.ipAddress || null,
    created_at: log.createdAt || new Date().toISOString(),
  };
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email || 'System',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details || {},
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export const AuditLogModel = {
  async create({ userId, userEmail = 'System', action, entityType, entityId = null, details = {}, ipAddress = null }) {
    const payload = toDatabasePayload({
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
    });

    const rows = await supabaseRequest('audit_logs', {
      method: 'POST',
      body: payload,
    });

    return normalize(rows[0]);
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

    const rows = await supabaseRequest('audit_logs', { searchParams });
    return rows
      .map(normalize)
      .filter((log) => !filters.entityType || log.entityType === filters.entityType)
      .filter((log) => !filters.entityId || log.entityId === filters.entityId)
      .filter((log) => !filters.action || matchesText(log.action, filters.action))
      .filter((log) => !filters.userEmail || matchesText(log.userEmail, filters.userEmail))
      .filter(
        (log) =>
          !filters.search ||
          matchesText(log.action, filters.search) ||
          matchesText(log.entityType, filters.search) ||
          matchesText(log.userEmail, filters.search) ||
          matchesText(JSON.stringify(log.details), filters.search)
      )
      .slice(0, limit);
  },
};
