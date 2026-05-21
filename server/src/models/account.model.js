import { supabaseRequest } from '../config/supabase.js';

const ACCOUNT_TYPES = ['internal', 'external'];

function normalizeType(value) {
  const next = String(value || '').trim().toLowerCase();
  return ACCOUNT_TYPES.includes(next) ? next : 'external';
}

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next === '' ? null : next;
}

function normalize(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name || '',
    accountType: row.account_type || 'external',
    account_type: row.account_type || 'external',
    lastUsedAt: row.last_used_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export const AccountModel = {
  async findAll({ search, type } = {}) {
    const searchParams = {
      select: '*',
      order: 'name.asc',
    };

    if (search) searchParams.name = `ilike.*${String(search).trim()}*`;
    if (type && ACCOUNT_TYPES.includes(type)) searchParams.account_type = `eq.${type}`;

    const rows = await supabaseRequest('accounts', { searchParams });
    return rows.map(normalize);
  },

  async findRecent(limit = 4) {
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        select: '*',
        order: 'last_used_at.desc.nullslast,created_at.desc',
        limit: String(limit),
      },
    });
    return rows.map(normalize);
  },

  async create(data) {
    const payload = {
      name: blankToNull(data.name),
      account_type: normalizeType(data.accountType || data.account_type),
      last_used_at: new Date().toISOString(),
    };

    const rows = await supabaseRequest('accounts', {
      method: 'POST',
      body: payload,
    });
    return normalize(rows[0]);
  },

  async touch(id) {
    const rows = await supabaseRequest('accounts', {
      method: 'PATCH',
      searchParams: {
        id: `eq.${id}`,
      },
      body: {
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    return normalize(rows[0]);
  },
};
