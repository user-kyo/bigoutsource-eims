import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', NotificationController.list);
router.post('/read-all', NotificationController.markAllRead);
router.delete('/', NotificationController.clearAll);

export default router;
