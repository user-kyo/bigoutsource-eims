import { AuditLogModel } from '../models/auditLog.model.js';
import { success } from '../utils/apiResponse.js';

export const AuditLogController = {
  async list(req, res, next) {
    try {
      return success(res, await AuditLogModel.findAll(req.query));
    } catch (error) {
      return next(error);
    }
  },
};
