import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: [true, 'Chat is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      minlength: [1, 'Message text cannot be empty'],
      maxlength: [2000, 'Message text cannot exceed 2000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Compound indexes for efficient message queries
messageSchema.index({ chat: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ chat: 1, receiver: 1, isRead: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;

