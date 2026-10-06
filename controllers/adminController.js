const AIReviewGeneration = require('../models/AIReviewGeneration');
const Business = require('../models/Business');
const Feedback = require('../models/Feedback');
const Location = require('../models/Location');
const Rating = require('../models/Rating');
const User = require('../models/User');

const getAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: users });
  } catch (error) { return next(error); }
};

const getAdminBusinesses = async (req, res, next) => {
  try {
    const businesses = await Business.find().populate('owner', 'name email').sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: businesses });
  } catch (error) { return next(error); }
};

const getAdminLocations = async (req, res, next) => {
  try {
    const locations = await Location.find().populate('business', 'businessName').sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: locations });
  } catch (error) { return next(error); }
};

const getAdminFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find().populate('business', 'businessName').populate('location', 'name').sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: feedback });
  } catch (error) { return next(error); }
};

const getAdminStatistics = async (req, res, next) => {
  try {
    const [totalUsers, totalBusinesses, locations, totalReviews, totalFeedback, totalReviewsGenerated] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Location.find().select('scanCount').lean(),
      Rating.countDocuments(),
      Feedback.countDocuments(),
      AIReviewGeneration.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalBusinesses,
        totalLocations: locations.length,
        totalReviews,
        totalReviewsGenerated,
        totalFeedback,
        totalQrScans: locations.reduce((sum, location) => sum + (location.scanCount || 0), 0),
      },
    });
  } catch (error) { return next(error); }
};

module.exports = {
  getAdminUsers,
  getAdminBusinesses,
  getAdminLocations,
  getAdminFeedback,
  getAdminStatistics,
};
