import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import { getReqUserId } from '../utils/getReqUserId.js';

/**
 * Start or get existing direct message chat between two users
 * POST /api/chats/start
 * 
 * @contract
 * Request:
 *   Headers:
 *     Authorization: Bearer <JWT_TOKEN>
 *     Content-Type: application/json
 *   Body:
 *     {
 *       "receiverId": "string (ObjectId) - required"
 *     }
 * 
 * Response (200 - Chat already exists):
 *   {
 *     "success": true,
 *     "message": "Chat already exists",
 *     "chat": {
 *       "_id": "...",
 *       "participants": [...],
 *       "lastMessage": null,
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     }
 *   }
 * 
 * Response (201 - Chat created):
 *   {
 *     "success": true,
 *     "message": "Chat created",
 *     "chat": {
 *       "_id": "...",
 *       "participants": [...],
 *       "lastMessage": null,
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     }
 *   }
 * 
 * Response (400):
 *   {
 *     "success": false,
 *     "message": "...",
 *     "details": { "field": "...", "value": "..." }
 *   }
 * 
 * @example
 * # Get JWT token first (from login endpoint)
 * TOKEN=$(curl -X POST http://localhost:5001/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"user@example.com","password":"password123"}' \
 *   | jq -r '.data.token')
 * 
 * # Start chat (first request - creates new chat)
 * curl -X POST http://localhost:5001/api/chats/start \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -d '{
 *     "receiverId": "507f1f77bcf86cd799439011"
 *   }'
 * 
 * # Expected response (201):
 * # {
 * #   "success": true,
 * #   "message": "Chat created",
 * #   "chat": { ... }
 * # }
 * 
 * # Repeat same request (returns existing chat)
 * curl -X POST http://localhost:5001/api/chats/start \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -d '{
 *     "receiverId": "507f1f77bcf86cd799439011"
 *   }'
 * 
 * # Expected response (200):
 * # {
 * #   "success": true,
 * #   "message": "Chat already exists",
 * #   "chat": { ... }
 * # }
 */
export const startChat = async (req, res, next) => {
  try {
    // Ensure req.user exists and has id
    if (!req.user || !req.user.id) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CHAT_START] 401: Authentication failed - req.user missing or invalid');
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        details: { type: 'AUTH_REQUIRED' },
      });
    }

    // Extract receiverId - ONLY field required
    const receiverIdRaw = req.body.receiverId;
    
    // Log for debugging (dev only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CHAT_START] Processing:', {
        userId: req.user.id,
        receiverId: receiverIdRaw,
      });
    }

    // STRICT VALIDATION - BEFORE ANY DB OPERATIONS
    
    // Validate receiverId: required, non-empty string, not "null"/"undefined"
    if (!receiverIdRaw || 
        receiverIdRaw === null || 
        receiverIdRaw === undefined ||
        (typeof receiverIdRaw === 'string' && receiverIdRaw.trim() === '') ||
        receiverIdRaw === 'null' || 
        receiverIdRaw === 'undefined') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CHAT_START] 400: receiverId is required', { receiverId: receiverIdRaw });
      }
      return res.status(400).json({
        success: false,
        message: 'receiverId is required and must be a non-empty string',
        details: {
          type: 'VALIDATION_ERROR',
          field: 'receiverId',
          value: receiverIdRaw,
        },
      });
    }

    // Trim if string
    const receiverId = typeof receiverIdRaw === 'string' ? receiverIdRaw.trim() : receiverIdRaw;
    
    // Validate ObjectId format for receiverId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CHAT_START] 400: Invalid receiverId format', { receiverId });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid receiverId format',
        details: {
          type: 'INVALID_ID',
          field: 'receiverId',
          value: receiverIdRaw,
        },
      });
    }

    // Convert to ObjectIds
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
    const meObjectId = new mongoose.Types.ObjectId(req.user.id);

    // Check receiver is not current user
    if (receiverObjectId.toString() === meObjectId.toString()) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CHAT_START] 400: Cannot start chat with yourself');
      }
      return res.status(400).json({
        success: false,
        message: 'Cannot start chat with yourself',
        details: {
          type: 'VALIDATION_ERROR',
          field: 'receiverId',
        },
      });
    }

    // Build sorted pair (canonical order for user1/user2)
    const [a, b] = [meObjectId.toString(), receiverObjectId.toString()].sort();
    const user1Id = new mongoose.Types.ObjectId(a);
    const user2Id = new mongoose.Types.ObjectId(b);

    // One conversation per pair: find existing chat where current user has not deleted it for themselves
    let chat = await Chat.findOne({ user1: user1Id, user2: user2Id, deletedFor: { $ne: meObjectId } })
      .populate('participants', 'name email')
      .populate('lastMessage')
      .lean();

    if (chat) {
      return res.status(200).json({
        success: true,
        message: 'Chat already exists',
        chat: {
          _id: chat._id,
          participants: chat.participants,
          lastMessage: chat.lastMessage,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        },
      });
    }

    // Create new chat (one per user pair)
    const newChat = await Chat.create({
      participants: [user1Id, user2Id],
      user1: user1Id,
      user2: user2Id,
    });
    await newChat.populate('participants', 'name email');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CHAT_START] Created new chat:', { chatId: newChat._id.toString(), userId: req.user.id, receiverId });
    }

    return res.status(201).json({
      success: true,
      message: 'Chat created',
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

    // No duplicate key handling needed - unlimited chats allowed (no unique constraints)

    // Pass error to error handler middleware
    return next(error);
  }
};

/**
 * Get unread messages count for current user
 * GET /api/chats/unread-count
 */
export const unreadCount = async (req, res, next) => {
  try {
    // Get userId using helper (production-safe)
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        details: { type: 'AUTH_REQUIRED' },
      });
    }

    // Convert to ObjectId for query
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Chat ids where user is participant and has not deleted the chat for themselves
    const nonDeletedChatIds = await Chat.find({
      participants: { $in: [userObjectId] },
      deletedFor: { $ne: userObjectId },
    })
      .select('_id')
      .lean()
      .then((chats) => chats.map((c) => c._id));

    // Count unread messages only in non-deleted chats
    const count = await Message.countDocuments({
      receiver: userObjectId,
      isRead: false,
      chat: { $in: nonDeletedChatIds },
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all chats for current user
 * GET /api/chats
 */
export const getChats = async (req, res, next) => {
  try {
    // Get userId using helper (production-safe)
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        details: { type: 'AUTH_REQUIRED' },
      });
    }

    // Convert to ObjectId for queries
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // List chats where user is participant and has NOT deleted the chat for themselves
    const chats = await Chat.find({
      participants: { $in: [userObjectId] },
      deletedFor: { $ne: userObjectId },
    })
      .populate('participants', 'name email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    // Chat ids we're listing (all non-deleted for this user)
    const chatIds = chats.map((c) => c._id);

    // Unread counts only for these (non-deleted) chats
    const unreadAgg = await Message.aggregate([
      { $match: { receiver: userObjectId, isRead: false, chat: { $in: chatIds } } },
      { $group: { _id: '$chat', count: { $sum: 1 } } },
    ]);

    // Build map: chatId -> unreadCount
    const unreadMap = new Map(
      unreadAgg.map((x) => [String(x._id), x.count])
    );

    // Total unread only for listed (non-deleted) chats
    const totalUnread = unreadAgg.reduce((sum, x) => sum + x.count, 0);

    // Add unreadCount to each chat
    const chatsWithUnread = chats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap.get(String(chat._id)) || 0,
    }));

    res.status(200).json({
      success: true,
      chats: chatsWithUnread,
      totalUnread,
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
    // Get userId using helper (production-safe)
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        details: { type: 'AUTH_REQUIRED' },
      });
    }

    const chatId = req.params.id;
    const currentUserId = new mongoose.Types.ObjectId(userId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return next(
        new AppError('Invalid chat ID format', 400, {
          type: 'INVALID_ID',
          field: 'id',
        })
      );
    }

    const chat = await Chat.findById(chatId).exec();
    if (!chat) {
      return next(
        new AppError('Chat not found', 404, {
          type: 'NOT_FOUND',
          resource: 'Chat',
        })
      );
    }

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

    const deletedForIds = (chat.deletedFor || []).map((id) => id.toString());
    if (deletedForIds.includes(currentUserId.toString())) {
      return next(
        new AppError('Chat not found', 404, {
          type: 'NOT_FOUND',
          resource: 'Chat',
        })
      );
    }

    // Get messages sorted by createdAt ascending
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read for current user (only messages received by user)
    await Message.updateMany(
      { chat: chatId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a chat by ID
 * GET /api/chats/:id
 */
export const getChatById = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const chatId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat ID format',
        details: { type: 'INVALID_ID', field: 'id' },
      });
    }

    const me = req.user._id.toString();
    const meObjectId = new mongoose.Types.ObjectId(me);

    const chat = await Chat.findOne({ _id: chatId }).exec();
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isParticipant = chat.participants?.some((p) => p.toString() === me);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        details: { type: 'FORBIDDEN' },
      });
    }

    const deletedForIds = (chat.deletedFor || []).map((id) => id.toString());
    if (deletedForIds.includes(me)) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Populate participants (name, email) and lastMessage
    await chat.populate('participants', 'name email');
    await chat.populate('lastMessage');

    return res.status(200).json({
      success: true,
      chat: {
        _id: chat._id,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete a chat for the current user only (per-user delete).
 * DELETE /api/chats/:id
 */
export const deleteChat = async (req, res, next) => {
  try {
    const me = (req.user && (req.user._id || req.user.id))?.toString();
    if (!me) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const chatId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat ID format',
        details: { type: 'INVALID_ID', field: 'id' },
      });
    }

    const meObjectId = new mongoose.Types.ObjectId(me);
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [meObjectId] },
    }).exec();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
        details: { type: 'NOT_FOUND' },
      });
    }

    const deletedForIds = (chat.deletedFor || []).map((id) => id.toString());
    if (deletedForIds.includes(me)) {
      return res.status(200).json({
        success: true,
        message: 'Already deleted.',
      });
    }

    if (!chat.deletedFor) chat.deletedFor = [];
    chat.deletedFor.push(meObjectId);
    if (!chat.deletedAtBy) chat.deletedAtBy = [];
    chat.deletedAtBy.push({ user: meObjectId, at: new Date() });
    await chat.save();

    logger.info('[CHAT_DELETE] Per-user delete', { userId: me, chatId });

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted.',
    });
  } catch (err) {
    return next(err);
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

    const chat = await Chat.findOne({ _id: chatId, participants: { $in: [currentUserId] } }).exec();
    if (!chat) {
      return next(
        new AppError('Chat not found', 404, {
          type: 'NOT_FOUND',
          resource: 'Chat',
        })
      );
    }

    const deletedForIds = (chat.deletedFor || []).map((id) => id.toString());
    if (deletedForIds.includes(currentUserId.toString())) {
      logger.warn('[CHAT_SEND_MESSAGE] Blocked: chat deleted for user', { userId: currentUserId.toString(), chatId });
      return res.status(403).json({
        success: false,
        code: 'CHAT_DELETED_FOR_USER',
        message: 'Chat is deleted',
      });
    }

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

    // Determine receiver (the other participant in the chat)
    const receiverId = chat.participants.find(
      (participantId) => participantId.toString() !== currentUserId.toString()
    );

    if (!receiverId) {
      return next(
        new AppError('Cannot determine receiver', 400, {
          type: 'INVALID_CHAT',
        })
      );
    }

    // Create message with receiver
    const message = await Message.create({
      chat: chatId,
      sender: currentUserId,
      receiver: receiverId,
      text: text.trim(),
      isRead: false, // New message is unread by default
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
        receiver: message.receiver,
        text: message.text,
        isRead: message.isRead,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
