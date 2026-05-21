import { query } from '../config/db.js';

export const AuditLogModel = {
  async create({ userId, action, entityType, entityId = null, details = {}, ipAddress = null }) {
    const result = await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, action, entityType, entityId, details, ipAddress]
    );
    return result.rows[0];
  },

  async findAll(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.entityType) {
      params.push(filters.entityType);
      conditions.push(`al.entity_type = $${params.length}`);
    }

    if (filters.entityId) {
      params.push(filters.entityId);
      conditions.push(`al.entity_id = $${params.length}`);
    }

    if (filters.action) {
      params.push(`%${filters.action}%`);
      conditions.push(`al.action ILIKE $${params.length}`);
    }

    if (filters.userEmail) {
      params.push(`%${filters.userEmail}%`);
      conditions.push(`u.email ILIKE $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(
        al.action ILIKE $${params.length}
        OR al.entity_type ILIKE $${params.length}
        OR u.email ILIKE $${params.length}
        OR al.details::text ILIKE $${params.length}
      )`);
    }

    const limit = Math.min(Number(filters.limit || 500), 1000);
    params.push(limit);

    const result = await query(
      `SELECT
         al.id,
         al.user_id AS "userId",
         al.action,
         al.entity_type AS "entityType",
         al.entity_id AS "entityId",
         al.details,
         al.ip_address AS "ipAddress",
         al.created_at AS "createdAt",
         u.email AS "userEmail"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY al.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  },
};
