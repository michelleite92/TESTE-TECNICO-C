import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', authMiddleware, login);

export default router;
