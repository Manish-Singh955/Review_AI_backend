const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    qrCode: {
      type: String,
      required: true,
      trim: true,
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
    comment: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'English',
    },
  },
  {
    timestamps: true,
  }
);

ratingSchema.index({ location: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
