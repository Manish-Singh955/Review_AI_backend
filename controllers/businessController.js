const Business = require('../models/Business');

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

const updateBusiness = async (req, res) => {
  try {
    if (req.user.role !== 'business' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only business owners can update business profiles' });
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

    const business = await Business.findOne({ owner: req.user.id });

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

module.exports = {
  createBusiness,
  getBusiness,
  updateBusiness,
};
