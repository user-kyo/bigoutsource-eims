import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('super_admin', 'hr_admin', 'it_admin'), AuditLogController.list);

export default router;
