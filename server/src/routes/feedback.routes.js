import { Router } from 'express';
import {
  getSessionFeedback,
  getProgressTrends,
  getDetailedAnalysis,
} from '../controllers/feedback.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/trends', getProgressTrends);
router.get('/:sessionId', getSessionFeedback);
router.get('/:sessionId/detailed', getDetailedAnalysis);

export default router;
