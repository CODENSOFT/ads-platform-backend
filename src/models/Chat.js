import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      required: [true, 'Participants are required'],
      validate: {
        validator: function (participants) {
          return participants && participants.length === 2;
        },
        message: 'Chat must have exactly 2 participants',
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Index for efficient queries: find chats by participants
chatSchema.index({ participants: 1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

