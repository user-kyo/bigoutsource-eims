import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';

const router = Router();

router.get('/', SettingsController.get);
router.put('/', SettingsController.update);

export default router;
