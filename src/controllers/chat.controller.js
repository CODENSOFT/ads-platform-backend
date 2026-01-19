import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

/**
 * Start or get existing chat
 * POST /api/chats/start
 */
export const startChat = async (req, res, next) => {
  try {
    // Ensure req.user exists and has _id
    if (!req.user || !req.user._id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    const currentUserId = req.user._id;
    const { receiverId } = req.body;

    // Validate receiverId exists and is non-empty string
    if (!receiverId || typeof receiverId !== 'string' || receiverId.trim().length === 0) {
      return next(
        new AppError('receiverId is required and must be a non-empty string', 400, {
          type: 'VALIDATION_ERROR',
          field: 'receiverId',
        })
      );
    }

    // Validate receiverId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return next(
        new AppError('Invalid receiverId format', 400, {
          type: 'INVALID_ID',
          field: 'receiverId',
        })
      );
    }

    // Check receiver is not current user
    if (receiverId === currentUserId.toString()) {
      return next(
        new AppError('Cannot start chat with yourself', 400, {
          type: 'INVALID_RECEIVER',
        })
      );
    }

    // Ensure receiver user exists in DB
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return next(
        new AppError('Receiver user not found', 404, {
          type: 'NOT_FOUND',
          resource: 'User',
        })
      );
    }

    // Convert to ObjectIds for query
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Find existing chat between the two participants
    // Query: participants contains both users AND exactly 2 participants
    const existingChat = await Chat.findOne({
      participants: { $all: [currentUserObjectId, receiverObjectId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });

    if (existingChat) {
      // Populate participants (name, email)
      await existingChat.populate('participants', 'name email');

      // Return existing chat
      return res.status(200).json({
        success: true,
        chat: {
          _id: existingChat._id,
          participants: existingChat.participants,
          lastMessage: existingChat.lastMessage,
          createdAt: existingChat.createdAt,
          updatedAt: existingChat.updatedAt,
        },
      });
    }

    // Create new chat
    const newChat = await Chat.create({
      participants: [currentUserObjectId, receiverObjectId],
    });

    // Populate participants (name, email)
    await newChat.populate('participants', 'name email');

    // Return new chat
    return res.status(201).json({
      success: true,
      chat: {
        _id: newChat._id,
        participants: newChat.participants,
        lastMessage: newChat.lastMessage,
        createdAt: newChat.createdAt,
        updatedAt: newChat.updatedAt,
      },
    });
  } catch (error) {
    // Log error for debugging (500 errors)
    logger.error('[CHAT_START_ERROR]', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      userId: req.user?._id?.toString(),
      receiverId: req.body?.receiverId,
    });

    // If it's a validation error from Mongoose, convert to 400
    if (error instanceof mongoose.Error.ValidationError) {
      return next(
        new AppError('Validation failed', 400, {
          type: 'VALIDATION_ERROR',
          errors: Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
          })),
        })
      );
    }

    // If it's a duplicate key error, try to find existing chat
    if (error.code === 11000) {
      try {
        const currentUserId = req.user?._id;
        const { receiverId } = req.body;

        if (currentUserId && receiverId && mongoose.Types.ObjectId.isValid(receiverId)) {
          const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
          const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

          const existingChat = await Chat.findOne({
            participants: { $all: [currentUserObjectId, receiverObjectId] },
            $expr: { $eq: [{ $size: '$participants' }, 2] },
          });

          if (existingChat) {
            await existingChat.populate('participants', 'name email');

            return res.status(200).json({
              success: true,
              chat: {
                _id: existingChat._id,
                participants: existingChat.participants,
                lastMessage: existingChat.lastMessage,
                createdAt: existingChat.createdAt,
                updatedAt: existingChat.updatedAt,
              },
            });
          }
        }
      } catch (retryError) {
        // If retry fails, pass original error
        logger.error('[CHAT_START_RETRY_ERROR]', {
          message: retryError.message,
          originalError: error.message,
        });
      }
    }

    // Pass error to error handler middleware
    return next(error);
  }
};

/**
 * Get all chats for current user
 * GET /api/chats
 */
export const getChats = async (req, res, next) => {
  try {
    // Ensure req.user exists and has _id
    if (!req.user || !req.user._id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    const currentUserId = req.user._id;

    // Find all chats where user is a participant
    const chats = await Chat.find({
      participants: currentUserId,
    })
      .populate('participants', 'name email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a chat
 * GET /api/chats/:id/messages
 */
export const getMessages = async (req, res, next) => {
  try {
    // Ensure req.user exists and has _id
    if (!req.user || !req.user._id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    const chatId = req.params.id;
    const currentUserId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return next(
        new AppError('Invalid chat ID format', 400, {
          type: 'INVALID_ID',
          field: 'id',
        })
      );
    }

    // Find chat and verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(
        new AppError('Chat not found', 404, {
          type: 'NOT_FOUND',
          resource: 'Chat',
        })
      );
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      (participantId) => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(
        new AppError('Access denied. You are not a participant in this chat', 403, {
          type: 'FORBIDDEN',
        })
      );
    }

    // Get messages sorted by createdAt ascending
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message in a chat
 * POST /api/chats/:id/messages
 */
export const sendMessage = async (req, res, next) => {
  try {
    // Ensure req.user exists and has _id
    if (!req.user || !req.user._id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    const chatId = req.params.id;
    const { text } = req.body;
    const currentUserId = req.user._id;

    // Validate chat ID format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return next(
        new AppError('Invalid chat ID format', 400, {
          type: 'INVALID_ID',
          field: 'id',
        })
      );
    }

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return next(
        new AppError('Message text is required', 400, {
          type: 'VALIDATION_ERROR',
          field: 'text',
        })
      );
    }

    if (text.trim().length > 2000) {
      return next(
        new AppError('Message text cannot exceed 2000 characters', 400, {
          type: 'VALIDATION_ERROR',
          field: 'text',
        })
      );
    }

    // Find chat and verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(
        new AppError('Chat not found', 404, {
          type: 'NOT_FOUND',
          resource: 'Chat',
        })
      );
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      (participantId) => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(
        new AppError('Access denied. You are not a participant in this chat', 403, {
          type: 'FORBIDDEN',
        })
      );
    }

    // Create message
    const message = await Message.create({
      chat: chatId,
      sender: currentUserId,
      text: text.trim(),
    });

    // Populate sender
    await message.populate('sender', 'name email');

    // Update chat lastMessage and lastMessageAt
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: {
        _id: message._id,
        chat: message.chat,
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
