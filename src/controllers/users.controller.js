// src/controllers/users.controller.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ad from '../models/Ad.js';

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await User.findById(userId).select('name email avatar createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ads = await Ad.find({ user: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, user, ads });
  } catch (error) {
    return next(error);
  }
};

export const getUserPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(id).select('name avatar createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const ads = await Ad.find({ user: id, status: 'active', isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, user, ads });
  } catch (error) {
    return next(error);
  }
};
