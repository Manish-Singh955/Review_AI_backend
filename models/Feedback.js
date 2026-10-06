const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    category: {
      type: String,
      enum: ['service', 'food', 'staff', 'cleanliness', 'price', 'other'],
      default: 'other',
    },
    message: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
