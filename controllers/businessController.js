const mongoose = require('mongoose');
const Business = require('../models/Business');
const Location = require('../models/Location');
const { toQueryString } = require('../utils/sanitize');

const createBusiness = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can manage business profiles' });
    }

    const {
      businessName,
      category,
      logo,
      description,
      phone,
      email,
      website,
      address,
      businessHours,
    } = req.body;

    if (!businessName || !category || !address) {
      return res.status(400).json({
        message: 'Business name, category, and address are required',
      });
    }

    const existingBusiness = await Business.findOne({ owner: req.user.id });

    if (existingBusiness) {
      return res.status(400).json({
        message: 'You already have a business profile',
      });
    }

    const business = await Business.create({
      owner: req.user.id,
      businessName,
      category,
      logo: logo || '',
      description: description || '',
      phone: phone || '',
      email: email || '',
      website: website || '',
      address,
      businessHours: businessHours || '',
    });

    return res.status(201).json({
      message: 'Business profile created successfully',
      business,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Business creation failed',
    });
  }
};

const getBusiness = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can access business profiles' });
    }

    const business = await Business.findOne({ owner: req.user.id });

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    return res.status(200).json({ business });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch business profile',
    });
  }
};

// Resolves the owner's business, by :id when the route provides one.
const findOwnedBusiness = (req) => {
  const filter = { owner: req.user.id };
  if (req.params.id !== undefined) {
    filter._id = toQueryString(req.params.id);
  }
  return Business.findOne(filter);
};

const updateBusiness = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can update business profiles' });
    }

    if (req.params.id !== undefined && !mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const {
      businessName,
      category,
      logo,
      description,
      phone,
      email,
      website,
      address,
      businessHours,
    } = req.body;

    if (!businessName || !category || !address) {
      return res.status(400).json({
        message: 'Business name, category, and address are required',
      });
    }

    const business = await findOwnedBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      business._id,
      {
        businessName,
        category,
        logo: logo || business.logo,
        description: description || business.description,
        phone: phone || business.phone,
        email: email || business.email,
        website: website || business.website,
        address,
        businessHours: businessHours || business.businessHours,
      },
      { new: true }
    );

    return res.status(200).json({
      message: 'Business profile updated successfully',
      business: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Business update failed',
    });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can delete business profiles' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const business = await findOwnedBusiness(req);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    // Locations are soft-deleted so their QR codes stop working while
    // ratings, scans, clicks and feedback stay in the database.
    await Location.updateMany(
      { business: business._id, deletedAt: null },
      { isActive: false, deletedAt: new Date() }
    );
    await Business.deleteOne({ _id: business._id });

    return res.status(200).json({ message: 'Business profile deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      message: 'Business deletion failed',
    });
  }
};

module.exports = {
  createBusiness,
  getBusiness,
  updateBusiness,
  deleteBusiness,
};
