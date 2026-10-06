const express = require('express');
const { createBusiness, getBusiness, updateBusiness } = require('../controllers/businessController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createBusiness);
router.get('/', protect, getBusiness);
router.put('/', protect, updateBusiness);

module.exports = router;
