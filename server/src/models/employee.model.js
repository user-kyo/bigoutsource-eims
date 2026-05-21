import { query, transaction } from '../config/db.js';

const employeeSelect = `
  SELECT
    e.id,
    e.employee_number,
    e.full_name,
    e.bo_email,
    e.email_password,
    e.phone,
    e.address,
    e.account_assignment,
    e.lms_account,
    e.site_id,
    s.name AS site,
    es.name AS status,
    ep.avatar_url,
    d.pc_name,
    d.bios_date,
    d.windows_key,
    d.rustdesk_id,
    d.remote_id,
    d.eset_status,
    d.activity_watch_status,
    e.created_at,
    e.updated_at
  FROM employees e
  LEFT JOIN sites s ON s.id = e.site_id
  LEFT JOIN employment_status es ON es.id = e.status_id
  LEFT JOIN employee_profiles ep ON ep.employee_id = e.id
  LEFT JOIN LATERAL (
    SELECT devices.*
    FROM device_assignments da
    JOIN devices ON devices.id = da.device_id
    WHERE da.employee_id = e.id AND da.returned_at IS NULL
    ORDER BY da.assigned_at DESC
    LIMIT 1
  ) d ON TRUE
`;

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    boEmail: row.bo_email,
    emailPassword: row.email_password,
    phone: row.phone,
    address: row.address,
    accountAssignment: row.account_assignment,
    lmsAccount: row.lms_account,
    siteId: row.site_id,
    site: row.site,
    status: row.status,
    avatarUrl: row.avatar_url,
    pcName: row.pc_name,
    biosDate: row.bios_date,
    windowsKey: row.windows_key,
    rustdeskId: row.rustdesk_id,
    remoteId: row.remote_id,
    esetStatus: row.eset_status,
    activityWatchStatus: row.activity_watch_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasDeviceFields(data) {
  return [
    data.pcName,
    data.biosDate,
    data.windowsKey,
    data.rustdeskId,
    data.rustDeskId,
    data.remoteId,
    data.esetStatus,
    data.activityWatchStatus,
  ].some(Boolean);
}

function generateEmployeeNumber() {
  return `BO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function generateLmsAccount(fullName = '') {
  const parts = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].replace(/['-]/g, '');

  const firstName = parts[0].replace(/['-]/g, '');
  const lastName = parts[parts.length - 1].replace(/['-]/g, '');
  return `${firstName}.${lastName}`;
}

async function resolveSiteId(client, data) {
  if (data.siteId) return data.siteId;
  if (!data.siteName) return null;

  const existing = await client.query('SELECT id FROM sites WHERE LOWER(name) = LOWER($1) LIMIT 1', [data.siteName]);
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query(
    'INSERT INTO sites (name, code, is_active) VALUES ($1, $2, TRUE) RETURNING id',
    [data.siteName, data.siteName.slice(0, 30).toUpperCase().replace(/\s+/g, '_')]
  );
  return created.rows[0].id;
}

async function upsertAssignedDevice(client, employeeId, data, userId, siteId) {
  const activeAssignment = await client.query(
    `SELECT d.id
     FROM device_assignments da
     JOIN devices d ON d.id = da.device_id
     WHERE da.employee_id = $1 AND da.returned_at IS NULL
     ORDER BY da.assigned_at DESC
     LIMIT 1`,
    [employeeId]
  );

  if (activeAssignment.rows[0]) {
    await client.query(
      `UPDATE devices
       SET pc_name = COALESCE($2, pc_name),
           bios_date = COALESCE($3, bios_date),
           windows_key = COALESCE($4, windows_key),
           rustdesk_id = COALESCE($5, rustdesk_id),
           remote_id = COALESCE($6, remote_id),
           eset_status = COALESCE($7, eset_status),
           activity_watch_status = COALESCE($8, activity_watch_status),
           site_id = COALESCE($9, site_id),
           updated_by = $10
       WHERE id = $1`,
      [
        activeAssignment.rows[0].id,
        data.pcName || null,
        data.biosDate || null,
        data.windowsKey || null,
        data.rustdeskId || data.rustDeskId || null,
        data.remoteId || null,
        data.esetStatus || null,
        data.activityWatchStatus || null,
        siteId || null,
        userId,
      ]
    );
    return;
  }

  const device = await client.query(
    `INSERT INTO devices (
       asset_tag, device_type, pc_name, bios_date, windows_key, rustdesk_id,
       remote_id, eset_status, activity_watch_status, status, site_id, created_by, updated_by
     )
     VALUES ($1, 'computer', $2, $3, $4, $5, $6, COALESCE($7, 'missing'), COALESCE($8, 'missing'), 'assigned', $9, $10, $10)
     RETURNING id`,
    [
      data.pcName || `NO-PC-${Date.now()}`,
      data.pcName || null,
      data.biosDate || null,
      data.windowsKey || null,
      data.rustdeskId || data.rustDeskId || null,
      data.remoteId || null,
      data.esetStatus || null,
      data.activityWatchStatus || null,
      siteId || null,
      userId,
    ]
  );

  await client.query(
    `INSERT INTO device_assignments (device_id, employee_id, assigned_by, notes)
     VALUES ($1, $2, $3, 'Created from employee record')`,
    [device.rows[0].id, employeeId, userId]
  );
}

export const EmployeeModel = {
  async findAll() {
    const result = await query(`${employeeSelect} ORDER BY e.created_at DESC`);
    return result.rows.map(normalize);
  },

  async findById(id) {
    const result = await query(`${employeeSelect} WHERE e.id = $1`, [id]);
    return normalize(result.rows[0]);
  },

  async create(data, userId) {
    const employeeId = await transaction(async (client) => {
      const siteId = await resolveSiteId(client, data);
      const result = await client.query(
        `INSERT INTO employees (
           employee_number, full_name, bo_email, email_password, phone, address, account_assignment,
           lms_account, site_id, status_id, created_by, updated_by
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           (SELECT id FROM employment_status WHERE name = COALESCE($10, 'active')),
           $11, $11
        )
         RETURNING id`,
        [
          data.employeeNumber || generateEmployeeNumber(),
          data.fullName,
          data.boEmail || null,
          data.emailPassword || null,
          data.phone || null,
          data.address || null,
          data.accountAssignment,
          data.lmsAccount || generateLmsAccount(data.fullName),
          siteId,
          data.status || 'active',
          userId,
        ]
      );

      if (hasDeviceFields(data)) {
        await upsertAssignedDevice(client, result.rows[0].id, data, userId, siteId);
      }

      return result.rows[0].id;
    });

    return this.findById(employeeId);
  },

  async update(id, data, userId) {
    const updatedId = await transaction(async (client) => {
      const siteId = await resolveSiteId(client, data);
      const nextLmsAccount = data.fullName ? generateLmsAccount(data.fullName) : data.lmsAccount;
      const result = await client.query(
        `UPDATE employees
         SET employee_number = COALESCE($2, employee_number),
             full_name = COALESCE($3, full_name),
             bo_email = COALESCE($4, bo_email),
             email_password = COALESCE($5, email_password),
             phone = COALESCE($6, phone),
             address = COALESCE($7, address),
             account_assignment = COALESCE($8, account_assignment),
             lms_account = COALESCE($9, lms_account),
             site_id = COALESCE($10, site_id),
             status_id = COALESCE((SELECT id FROM employment_status WHERE name = $11), status_id),
             updated_by = $12
         WHERE id = $1
         RETURNING id`,
        [
          id,
          data.employeeNumber,
          data.fullName,
          data.boEmail,
          data.emailPassword,
          data.phone,
          data.address,
          data.accountAssignment,
          nextLmsAccount,
          siteId,
          data.status,
          userId,
        ]
      );

      if (!result.rowCount) return null;

      if (hasDeviceFields(data)) {
        await upsertAssignedDevice(client, id, data, userId, siteId);
      }

      return result.rows[0].id;
    });

    return updatedId ? this.findById(id) : null;
  },

  async remove(id) {
    const result = await query('DELETE FROM employees WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
