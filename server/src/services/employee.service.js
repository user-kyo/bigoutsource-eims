import { EmployeeModel } from '../models/employee.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';
import { AppError } from '../utils/apiResponse.js';

const trackedFields = [
  'employeeNumber',
  'fullName',
  'boEmail',
  'emailPassword',
  'phone',
  'address',
  'accountAssignment',
  'lmsAccount',
  'site',
  'status',
  'pcName',
  'biosDate',
  'windowsKey',
  'rustdeskId',
  'remoteId',
  'esetStatus',
  'activityWatchStatus',
  'isArchived',
];

const systemUser = {
  id: 'system',
  email: 'System',
  fullName: 'System',
  role: 'system',
  roles: ['super_admin'],
};

function auditActor(user) {
  const actor = user || systemUser;

  return {
    userId: actor.id,
    userEmail: actor.email || 'System',
    userName: actor.fullName || actor.email || 'System',
    userRole: actor.role || actor.roles?.[0] || 'system',
  };
}

function comparable(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function diffEmployee(before, after) {
  return trackedFields
    .map((field) => ({
      field,
      from: comparable(before?.[field]),
      to: comparable(after?.[field]),
    }))
    .filter((change) => change.from !== change.to);
}

export const EmployeeService = {
  list() {
    return EmployeeModel.findAll();
  },

  async get(id) {
    const employee = await EmployeeModel.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  },

  async create(data, user, meta = {}) {
    const actor = auditActor(user);

    if (!data.employeeNumber && !data.employeeId && !data.id) {
      throw new AppError('id is required', 400);
    }

    if (!data.siteId && !data.siteName && !data.site) {
      throw new AppError('site is required', 400);
    }

    const employee = await EmployeeModel.create(data);
    await AuditLogModel.create({
      ...actor,
      action: 'employee.create',
      entityType: 'employees',
      entityId: employee.id,
      entityLabel: employee.fullName || employee.employeeNumber || employee.id,
      details: {
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        accountAssignment: employee.accountAssignment,
        site: employee.site,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return employee;
  },

  async update(id, data, user, meta = {}) {
    const actor = auditActor(user);
    const before = await EmployeeModel.findById(id);
    if (!before) throw new AppError('Employee not found', 404);

    const employee = await EmployeeModel.update(id, data);
    if (!employee) throw new AppError('Employee not found', 404);

    const changes = diffEmployee(before, employee);
    await AuditLogModel.create({
      ...actor,
      action: 'employee.update',
      entityType: 'employees',
      entityId: id,
      entityLabel: employee.fullName || employee.employeeNumber || id,
      details: {
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        changes,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return employee;
  },

  async remove(id, user, meta = {}) {
    const actor = auditActor(user);
    const removed = await EmployeeModel.remove(id);
    if (!removed) throw new AppError('Employee not found', 404);
    await AuditLogModel.create({
      ...actor,
      action: 'employee.delete',
      entityType: 'employees',
      entityId: id,
      entityLabel: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  },
};
