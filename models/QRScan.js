const mongoose = require('mongoose');

const qrScanSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

qrScanSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QRScan', qrScanSchema);
