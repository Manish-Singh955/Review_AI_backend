const mongoose = require('mongoose');

const googleClickSchema = new mongoose.Schema(
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
    googleReviewUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

googleClickSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('GoogleClick', googleClickSchema);
