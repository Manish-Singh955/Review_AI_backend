const Business = require('../models/Business');
const Feedback = require('../models/Feedback');
const GoogleClick = require('../models/GoogleClick');
const Location = require('../models/Location');
const QRScan = require('../models/QRScan');
const Rating = require('../models/Rating');
const AIReviewGeneration = require('../models/AIReviewGeneration');

const getDateFilter = (range) => {
  const now = new Date();
  let start;

  if (range === 'today') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (range === '7days') {
    start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 7);
  } else if (range === '30days') {
    start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 30);
  }

  return start ? { $gte: start, $lte: now } : null;
};

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || 'all';
    if (!['today', '7days', '30days', 'all'].includes(range)) {
      return res.status(400).json({ success: false, message: 'Range must be today, 7days, 30days, or all' });
    }

    const business = await Business.findOne({ owner: req.user.id }).select('_id');
    const locations = business ? await Location.find({ business: business._id }).select('_id isActive scanCount') : [];
    const locationIds = locations.map((location) => location._id);
    const dateFilter = getDateFilter(range);
    const timestampMatch = dateFilter ? { createdAt: dateFilter } : {};
    const locationMatch = { location: { $in: locationIds }, ...timestampMatch };

    const [ratingSummary, ratingGroups, feedbackSummary, feedbackGroups, totalReviewsGenerated, totalGoogleClicks, totalPrivateFeedback, recentReviews, recentFeedback] = await Promise.all([
      Rating.aggregate([
        { $match: locationMatch },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$rating' }, positive: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }, negative: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } } } },
      ]),
      Rating.aggregate([
        { $match: locationMatch },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
      business ? Feedback.aggregate([
        { $match: { business: business._id, ...timestampMatch } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$rating' }, positive: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }, negative: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } } } },
      ]) : [],
      business ? Feedback.aggregate([
        { $match: { business: business._id, ...timestampMatch } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]) : [],
      AIReviewGeneration.countDocuments(locationMatch),
      business ? GoogleClick.countDocuments({ business: business._id, ...timestampMatch }) : 0,
      business ? Feedback.countDocuments({ business: business._id, ...timestampMatch }) : 0,
      Rating.find(locationMatch).select('rating comment experiences createdAt location').populate('location', 'name').sort({ createdAt: -1 }).limit(5).lean(),
      business ? Feedback.find({ business: business._id, ...timestampMatch }).select('rating category message status priority createdAt location').populate('location', 'name').sort({ createdAt: -1 }).limit(5).lean() : [],
    ]);

    const ratingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    [...ratingGroups, ...feedbackGroups].forEach(({ _id, count }) => {
      ratingDistribution[String(_id)] += count;
    });

    let totalQrScans = 0;
    if (range === 'all') {
      totalQrScans = locations.reduce((total, location) => total + (location.scanCount || 0), 0);
    } else if (locationIds.length) {
      totalQrScans = await QRScan.countDocuments({ location: { $in: locationIds }, createdAt: dateFilter });
    }

    const summary = ratingSummary[0] || { count: 0, total: 0, positive: 0, negative: 0 };
    const privateSummary = feedbackSummary[0] || { count: 0, total: 0, positive: 0, negative: 0 };
    const totalRatings = summary.count + privateSummary.count;
    return res.json({
      success: true,
      data: {
        range,
        totalLocations: locations.length,
        activeLocations: locations.filter((location) => location.isActive).length,
        totalQrScans,
        totalRatings,
        totalReviewsGenerated,
        totalGoogleClicks,
        totalPrivateFeedback,
        averageRating: totalRatings ? Number(((summary.total + privateSummary.total) / totalRatings).toFixed(2)) : 0,
        positiveRatings: summary.positive + privateSummary.positive,
        negativeRatings: summary.negative + privateSummary.negative,
        ratingDistribution,
        recentReviews,
        recentFeedback,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getDashboardAnalytics };
