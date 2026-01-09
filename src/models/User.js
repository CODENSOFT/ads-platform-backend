import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
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
  // Generate raw token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash token using sha256
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Set passwordResetToken to hashed value
  this.passwordResetToken = hashedToken;

  // Set expiration to 10 minutes from now
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the raw token (not hashed) - this is what we send to the user
  return rawToken;
};

const User = mongoose.model('User', userSchema);

export default User;

