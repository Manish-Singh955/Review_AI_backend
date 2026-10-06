const mongoose = require('mongoose');
const Business = require('../models/Business');
const Feedback = require('../models/Feedback');
const Location = require('../models/Location');

const getPriorityByRating = (rating) => {
  if (rating <= 2) return 'high';
  if (rating === 3) return 'medium';
  return 'low';
};

const getSentimentByRating = (rating) => {
  if (rating <= 2) return 'negative';
  if (rating === 3) return 'neutral';
  return 'positive';
};

const getBusinessForOwner = async (req) => {
  return Business.findOne({ owner: req.user.id });
};

const createFeedback = async (req, res) => {
  try {
    const { qrCode, rating, category, message } = req.body;

    if (!qrCode || !rating || !String(message || '').trim()) {
      return res.status(400).json({
        message: 'QR code, rating, and message are required',
      });
    }

    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }

    if (category && !['service', 'food', 'staff', 'cleanliness', 'price', 'other'].includes(category)) {
      return res.status(400).json({ message: 'Invalid feedback category' });
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

    const feedback = await Feedback.create({
      business: business._id,
      location: location._id,
      rating: Number(rating),
      category: category || 'other',
      message: message.trim(),
      sentiment: getSentimentByRating(Number(rating)),
      priority: getPriorityByRating(Number(rating)),
      status: 'new',
    });

    return res.status(201).json({
      message: 'Thank you for your feedback.',
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Feedback submission failed',
    });
  }
};

const getFeedbackForBusiness = async (req, res) => {
  try {
    const business = await getBusinessForOwner(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const feedbackList = await Feedback.find({ business: business._id })
      .populate('location', 'name address')
      .sort({ createdAt: -1 });

    return res.status(200).json({ feedback: feedbackList });
  } catch (error) {
    return res.status(500).json({
      message: 'Could not load feedback inbox',
    });
  }
};

const updateFeedbackPriority = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }

    const business = await getBusinessForOwner(req);
    if (!business) return res.status(404).json({ message: 'Business profile not found' });
    const { priority } = req.body;

    const feedback = await Feedback.findOne({ _id: req.params.id, business: business._id });

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    feedback.priority = priority;
    await feedback.save();

    return res.status(200).json({ message: 'Feedback priority updated', feedback });
  } catch (error) {
    return res.status(500).json({
      message: 'Priority update failed',
    });
  }
};

const updateFeedbackCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }

    const business = await getBusinessForOwner(req);
    if (!business) return res.status(404).json({ message: 'Business profile not found' });
    const { category } = req.body;

    const feedback = await Feedback.findOne({ _id: req.params.id, business: business._id });

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (!['service', 'food', 'staff', 'cleanliness', 'price', 'other'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    feedback.category = category;
    await feedback.save();

    return res.status(200).json({ message: 'Feedback category updated', feedback });
  } catch (error) {
    return res.status(500).json({
      message: 'Category update failed',
    });
  }
};

const updateFeedbackStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }

    const business = await getBusinessForOwner(req);
    if (!business) return res.status(404).json({ message: 'Business profile not found' });
    const { status } = req.body;

    const feedback = await Feedback.findOne({ _id: req.params.id, business: business._id });

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    feedback.status = status;
    await feedback.save();

    return res.status(200).json({ message: 'Feedback status updated', feedback });
  } catch (error) {
    return res.status(500).json({
      message: 'Status update failed',
    });
  }
};

module.exports = {
  createFeedback,
  getFeedbackForBusiness,
  updateFeedbackPriority,
  updateFeedbackCategory,
  updateFeedbackStatus,
};
