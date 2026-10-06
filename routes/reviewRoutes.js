const express = require('express');
const {
  getPublicLocationByQr,
  submitRating,
  generateReview,
  recordGoogleClick,
} = require('../controllers/reviewController');

const router = express.Router();

router.get('/qr/:qrCode', getPublicLocationByQr);
router.post('/rating', submitRating);
router.post('/generate', generateReview);
router.post('/google-click', recordGoogleClick);

module.exports = router;
