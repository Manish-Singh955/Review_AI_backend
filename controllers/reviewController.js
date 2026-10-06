const Location = require('../models/Location');
const Rating = require('../models/Rating');
const Business = require('../models/Business');
const AIReviewGeneration = require('../models/AIReviewGeneration');
const GoogleClick = require('../models/GoogleClick');
const QRScan = require('../models/QRScan');
const { generateReviewSuggestions } = require('../services/aiReviewService');

const getPublicLocationByQr = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const location = await Location.findOne({ qrCode }).populate('business');

    if (!location) {
      return res.status(404).json({ message: 'This QR code is invalid or does not exist.' });
    }

    if (!location.isActive) {
      return res.status(400).json({ message: 'This QR code is inactive.' });
    }

    const business = location.business;

    if (!business) {
      return res.status(404).json({ message: 'Business not found for this location.' });
    }

    location.scanCount += 1;
    await Promise.all([
      location.save(),
      QRScan.create({ business: business._id, location: location._id }),
    ]);

    return res.status(200).json({
      business: {
        id: business._id,
        businessName: business.businessName,
        category: business.category,
        logo: business.logo,
        description: business.description,
        address: business.address,
        businessHours: business.businessHours,
      },
      location: {
        id: location._id,
        name: location.name,
        address: location.address,
        googleReviewUrl: location.googleReviewUrl,
        qrCode: location.qrCode,
        isActive: location.isActive,
        scanCount: location.scanCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to load review page',
    });
  }
};

const submitRating = async (req, res) => {
  try {
    const { qrCode, rating, experiences, comment, language } = req.body;

    if (!qrCode || !rating) {
      return res.status(400).json({ message: 'QR code and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!Number.isInteger(Number(rating))) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }

    const location = await Location.findOne({ qrCode });

    if (!location) {
      return res.status(404).json({ message: 'Location not found for this QR code' });
    }

    if (!location.isActive) {
      return res.status(400).json({ message: 'This QR code is inactive' });
    }

    const normalizedExperiences = Array.isArray(experiences)
      ? experiences.map((item) => String(item).trim())
      : [];

    const savedRating = await Rating.create({
      location: location._id,
      qrCode,
      rating,
      experiences: normalizedExperiences,
      comment: comment || '',
      language: language || 'English',
    });

    return res.status(201).json({
      message: 'Review submitted successfully',
      rating: savedRating,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Rating submission failed',
    });
  }
};

const generateReview = async (req, res) => {
  try {
    const { qrCode, rating, experiences, comment, language } = req.body;

    if (!qrCode || !rating) {
      return res.status(400).json({ message: 'QR code and rating are required' });
    }

    const location = await Location.findOne({ qrCode }).populate('business');

    if (!location) {
      return res.status(404).json({ message: 'Location not found for this QR code' });
    }

    if (!location.isActive) {
      return res.status(400).json({ message: 'This QR code is inactive' });
    }

    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!Number.isInteger(Number(rating))) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }

    if (Number(rating) <= Number(process.env.LOW_RATING_THRESHOLD || 3)) {
      return res.status(400).json({ message: 'Lower ratings are collected as private feedback instead' });
    }

    const customerComment = (comment || '').trim();
    const normalizedExperiences = Array.isArray(experiences)
      ? experiences.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (!customerComment && normalizedExperiences.length === 0) {
      return res.status(400).json({ message: 'Add a few words or select an experience aspect before generating a review' });
    }

    const suggestions = await generateReviewSuggestions({
      businessName: location.business?.businessName || 'Business',
      locationName: location.name,
      rating: Number(rating),
      experiences: normalizedExperiences,
      customerComment,
      language: language || 'English',
    });

    const savedGeneration = await AIReviewGeneration.create({
      location: location._id,
      rating: Number(rating),
      experiences: normalizedExperiences,
      customerComment,
      language: language || 'English',
      suggestions,
    });

    return res.status(200).json({
      message: 'Review suggestions generated successfully',
      suggestions,
      generationId: savedGeneration._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Review generation failed',
    });
  }
};

const recordGoogleClick = async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    const location = await Location.findOne({ qrCode }).populate('business');

    if (!location) {
      return res.status(404).json({ message: 'Location not found for this QR code' });
    }

    if (!location.isActive) {
      return res.status(400).json({ message: 'This QR code is inactive' });
    }

    const business = location.business;

    if (!business) {
      return res.status(404).json({ message: 'Business not found for this location' });
    }

    let reviewHost;
    try {
      const reviewUrl = new URL(location.googleReviewUrl);
      reviewHost = reviewUrl.hostname.toLowerCase();
      if (reviewUrl.protocol !== 'https:' || !(reviewHost === 'google.com' || reviewHost.endsWith('.google.com') || reviewHost === 'g.page' || reviewHost === 'maps.app.goo.gl')) {
        return res.status(400).json({ message: 'Google Review URL is invalid' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Google Review URL is invalid' });
    }

    await GoogleClick.create({
      business: business._id,
      location: location._id,
      googleReviewUrl: location.googleReviewUrl,
    });

    return res.status(200).json({
      message: 'Google click recorded',
      googleReviewUrl: location.googleReviewUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Google click tracking failed',
    });
  }
};

module.exports = {
  getPublicLocationByQr,
  submitRating,
  generateReview,
  recordGoogleClick,
};
