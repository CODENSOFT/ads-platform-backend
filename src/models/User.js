import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sha256 } from '../utils/crypto.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
      },
    ],
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    strict: true, // Reject unknown fields
  }
);

// Prevent modification of protected fields
userSchema.pre('save', function () {
  // Prevent overriding _id, createdAt, updatedAt
  if (this.isModified('_id')) {
    throw new Error('Cannot modify protected fields');
  }
});

// Hash password before saving
// Modern Mongoose: async function without next parameter
userSchema.pre('save', async function () {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  // Hash password with bcrypt (salt rounds: 12)
  this.password = await bcrypt.hash(this.password, 12);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token and store it
  this.resetPasswordTokenHash = sha256(resetToken);

  // Set expiration to 15 minutes from now
  this.resetPasswordExpiresAt = Date.now() + 15 * 60 * 1000;

  // Return the raw token (not hashed) - this is what we send to the user
  return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;

