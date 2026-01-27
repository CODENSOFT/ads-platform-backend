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
          // Must have exactly 2 participants
          if (!participants || participants.length !== 2) {
            return false;
          }
          // Prevent duplicate participants (same user twice)
          const ids = participants.map((p) => p.toString());
          return ids[0] !== ids[1];
        },
        message: 'Chat must have exactly 2 different participants',
      },
    },
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

// Pre-validate hook: Sort participants and set user1/user2 for canonical uniqueness
chatSchema.pre('validate', function (next) {
  if (!this.participants || this.participants.length !== 2) {
    return next(new mongoose.Error.ValidationError('Chat must have exactly 2 participants'));
  }

  // Convert to strings and sort lexicographically
  const sorted = [
    this.participants[0].toString(),
    this.participants[1].toString(),
  ].sort();

  // Prevent self-chat (same user twice)
  if (sorted[0] === sorted[1]) {
    return next(new mongoose.Error.ValidationError('Cannot create chat with same user twice'));
  }

  // Set participants in sorted order
  this.participants = [
    new mongoose.Types.ObjectId(sorted[0]),
    new mongoose.Types.ObjectId(sorted[1]),
  ];

  // Set canonical user1 and user2 (always sorted)
  this.user1 = new mongoose.Types.ObjectId(sorted[0]);
  this.user2 = new mongoose.Types.ObjectId(sorted[1]);

  next();
});

// Pre-save hook: Ensure consistency (same logic as pre-validate)
chatSchema.pre('save', function (next) {
  if (this.participants && this.participants.length === 2) {
    const sorted = [
      this.participants[0].toString(),
      this.participants[1].toString(),
    ].sort();

    this.participants = [
      new mongoose.Types.ObjectId(sorted[0]),
      new mongoose.Types.ObjectId(sorted[1]),
    ];

    this.user1 = new mongoose.Types.ObjectId(sorted[0]);
    this.user2 = new mongoose.Types.ObjectId(sorted[1]);
  }
  next();
});

// Indexes for efficient queries
chatSchema.index({ participants: 1 }); // For backward compatibility queries
chatSchema.index({ user1: 1 });
chatSchema.index({ user2: 1 });
// Unique compound index: only ONE chat per user pair (canonical order)
chatSchema.index({ user1: 1, user2: 1 }, { unique: true });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

