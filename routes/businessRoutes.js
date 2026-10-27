const express = require('express');
const { createBusiness, getBusiness, updateBusiness, deleteBusiness } = require('../controllers/businessController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createBusiness);
router.get('/', protect, getBusiness);
router.put('/', protect, updateBusiness);
router.put('/:id', protect, updateBusiness);
router.delete('/:id', protect, deleteBusiness);

module.exports = router;
