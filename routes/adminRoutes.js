const express = require('express');
const {
  getAdminUsers,
  getAdminBusinesses,
  getAdminLocations,
  getAdminFeedback,
  getAdminStatistics,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(protect, requireAdmin);

router.get('/users', getAdminUsers);
router.get('/businesses', getAdminBusinesses);
router.get('/locations', getAdminLocations);
router.get('/feedback', getAdminFeedback);
router.get('/statistics', getAdminStatistics);

module.exports = router;
