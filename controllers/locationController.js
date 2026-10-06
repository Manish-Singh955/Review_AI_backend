const mongoose = require('mongoose');
const Business = require('../models/Business');
const Location = require('../models/Location');

const isGoogleReviewUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'google.com' || host.endsWith('.google.com') || host === 'g.page' || host === 'maps.app.goo.gl'
    );
  } catch (error) {
    return false;
  }
};

const generateQrCodeValue = () => {
  return `review_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const getOwnerBusiness = async (req) => {
  if (req.user.role !== 'business' && req.user.role !== 'admin') {
    return null;
  }

  return Business.findOne({ owner: req.user.id });
};

const createLocation = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can manage locations' });
    }

    const { name, address, googleReviewUrl, googlePlaceId } = req.body;

    if (!name || !address || !googleReviewUrl) {
      return res.status(400).json({
        message: 'Location name, address, and Google review URL are required',
      });
    }

    if (!isGoogleReviewUrl(googleReviewUrl)) {
      return res.status(400).json({ message: 'Enter a valid HTTPS Google Review URL' });
    }

    const business = await getOwnerBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const qrCode = generateQrCodeValue();

    const location = await Location.create({
      business: business._id,
      name,
      address,
      googleReviewUrl,
      googlePlaceId: googlePlaceId || '',
      qrCode,
      isActive: true,
    });

    return res.status(201).json({
      message: 'Location created successfully',
      location,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Location creation failed',
    });
  }
};

const getLocations = async (req, res) => {
  try {
    const business = await getOwnerBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const locationFilter = { business: business._id };

    if (searchTerm) {
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchPattern = new RegExp(escapedSearch, 'i');
      if (!searchPattern.test(business.businessName)) {
        locationFilter.$or = [
          { name: searchPattern },
          { address: searchPattern },
          { qrCode: searchPattern },
        ];
      }
    }

    const locations = await Location.find(locationFilter).sort({ createdAt: -1 });

    return res.status(200).json({ locations });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch locations',
    });
  }
};

const getLocationById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid location ID' });
    }

    const business = await getOwnerBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const location = await Location.findOne({
      _id: req.params.id,
      business: business._id,
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    return res.status(200).json({ location });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch location',
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid location ID' });
    }

    const business = await getOwnerBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const location = await Location.findOne({
      _id: req.params.id,
      business: business._id,
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const { name, address, googleReviewUrl, googlePlaceId, isActive } = req.body;

    if (!name || !address || !googleReviewUrl) {
      return res.status(400).json({
        message: 'Location name, address, and Google review URL are required',
      });
    }

    if (!isGoogleReviewUrl(googleReviewUrl)) {
      return res.status(400).json({ message: 'Enter a valid HTTPS Google Review URL' });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      location._id,
      {
        name,
        address,
        googleReviewUrl,
        googlePlaceId: googlePlaceId || location.googlePlaceId,
        isActive: typeof isActive === 'boolean' ? isActive : location.isActive,
      },
      { new: true }
    );

    return res.status(200).json({
      message: 'Location updated successfully',
      location: updatedLocation,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Location update failed',
    });
  }
};

const deleteLocation = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid location ID' });
    }

    const business = await getOwnerBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const location = await Location.findOne({
      _id: req.params.id,
      business: business._id,
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    location.isActive = false;
    await location.save();

    return res.status(200).json({
      message: 'Location deactivated successfully',
      location,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Location deactivation failed',
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
