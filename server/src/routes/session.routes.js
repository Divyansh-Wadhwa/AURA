import { Router } from 'express';
import {
  startSession,
  sendMessage,
  endSession,
  getSession,
  getUserSessions,
  getUserStats,
} from '../controllers/session.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/start', startSession);
router.post('/:sessionId/message', sendMessage);
router.post('/:sessionId/end', endSession);
router.get('/stats', getUserStats);
router.get('/list', getUserSessions);
router.get('/:sessionId', getSession);

export default router;
