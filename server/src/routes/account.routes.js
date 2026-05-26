import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createAccountValidator } from '../validators/account.validator.js';

const router = Router();

router.get('/', AccountController.list);
router.get('/recent', AccountController.recent);
router.post('/', validate(createAccountValidator), AccountController.create);
router.post('/:id/touch', AccountController.touch);

export default router;
