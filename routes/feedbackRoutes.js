const express = require('express');
const {
  createFeedback,
  getFeedbackForBusiness,
  updateFeedbackPriority,
  updateFeedbackCategory,
  updateFeedbackStatus,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createFeedback);
router.get('/', protect, getFeedbackForBusiness);
router.put('/:id/priority', protect, updateFeedbackPriority);
router.put('/:id/category', protect, updateFeedbackCategory);
router.put('/:id/status', protect, updateFeedbackStatus);

module.exports = router;
