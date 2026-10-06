const mongoose = require('mongoose');

const aiReviewGenerationSchema = new mongoose.Schema(
  {
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
    experiences: {
      type: [String],
      default: [],
    },
    customerComment: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'English',
    },
    suggestions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

aiReviewGenerationSchema.index({ location: 1, createdAt: -1 });

module.exports = mongoose.model('AIReviewGeneration', aiReviewGenerationSchema);
