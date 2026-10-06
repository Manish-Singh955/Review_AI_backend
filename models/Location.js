const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true,
    },
    googleReviewUrl: {
      type: String,
      required: [true, 'Google review URL is required'],
      trim: true,
    },
    googlePlaceId: {
      type: String,
      default: '',
      trim: true,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scanCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Location', locationSchema);
