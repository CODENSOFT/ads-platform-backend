import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Migration script: Convert Chat collection to use user1/user2 canonical pair
 * - Drops old unique indexes on participants, ad+participants, ad
 * - Updates all chats to have sorted participants and user1/user2
 * - Removes duplicate chats (keeps newest, deletes others)
 * - Creates new unique index on { user1: 1, user2: 1 }
 * 
 * Run this once manually or on server startup
 */
export const migrateChatsToUserPair = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log('[MIGRATE] MongoDB connection not ready, skipping migration');
      return;
    }

    const collection = db.collection('chats');
    
    console.log('[MIGRATE] Starting chat migration: convert to user1/user2 pair...');

    // Step 1: Get all existing indexes
    const existingIndexes = await collection.indexes();
    console.log('[MIGRATE] Found', existingIndexes.length, 'indexes');

    // Step 2: Drop old unique indexes that include 'participants' or 'ad'
    const indexesToDrop = existingIndexes.filter((idx) => {
      if (!idx.key) return false;
      // Drop indexes that include 'participants' or 'ad'
      return 'participants' in idx.key || 'ad' in idx.key;
    });

    for (const index of indexesToDrop) {
      try {
        // Skip _id index
        if (index.name === '_id_') continue;
        await collection.dropIndex(index.name);
        console.log('[MIGRATE] Dropped index:', index.name);
      } catch (dropError) {
        if (dropError.code !== 27) { // 27 = IndexNotFound
          console.log('[MIGRATE] Error dropping index', index.name, ':', dropError.message);
        }
      }
    }

    // Step 3: Get all chats and update them
    const allChats = await collection.find({}).toArray();
    console.log('[MIGRATE] Processing', allChats.length, 'chats');

    let updated = 0;
    let deleted = 0;
    const updates = [];

    for (const chat of allChats) {
      // Skip chats with missing or invalid participants
      if (!chat.participants || !Array.isArray(chat.participants) || chat.participants.length !== 2) {
        console.log('[MIGRATE] Deleting invalid chat:', chat._id, '- participants:', chat.participants);
        await collection.deleteOne({ _id: chat._id });
        deleted++;
        continue;
      }

      // Convert participants to strings and sort lexicographically
      const sorted = [
        String(chat.participants[0]),
        String(chat.participants[1]),
      ].sort();

      // Skip self-chats (same user twice)
      if (sorted[0] === sorted[1]) {
        console.log('[MIGRATE] Deleting self-chat:', chat._id);
        await collection.deleteOne({ _id: chat._id });
        deleted++;
        continue;
      }

      // Prepare update: set sorted participants and user1/user2
      updates.push({
        updateOne: {
          filter: { _id: chat._id },
          update: {
            $set: {
              participants: [
                new mongoose.Types.ObjectId(sorted[0]),
                new mongoose.Types.ObjectId(sorted[1]),
              ],
              user1: new mongoose.Types.ObjectId(sorted[0]),
              user2: new mongoose.Types.ObjectId(sorted[1]),
            },
          },
        },
      });
    }

    // Bulk update all chats
    if (updates.length > 0) {
      await collection.bulkWrite(updates);
      updated = updates.length;
      console.log('[MIGRATE] Updated', updated, 'chats with user1/user2');
    }

    // Step 4: Handle duplicate chats (same user1/user2 pair)
    // Group by user1/user2
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: {
            user1: '$user1',
            user2: '$user2',
          },
          chats: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]).toArray();

    let duplicatesDeleted = 0;
    for (const group of duplicates) {
      // Sort chats by updatedAt (newest first)
      const sortedChats = group.chats.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      // Keep the newest chat, delete the rest
      const toKeep = sortedChats[0];
      const toDelete = sortedChats.slice(1);

      for (const chat of toDelete) {
        // Optionally: move lastMessage to the kept chat if it's newer
        if (chat.lastMessage && (!toKeep.lastMessage || 
            new Date(chat.updatedAt || 0) > new Date(toKeep.updatedAt || 0))) {
          await collection.updateOne(
            { _id: toKeep._id },
            { $set: { lastMessage: chat.lastMessage, updatedAt: chat.updatedAt || new Date() } }
          );
        }

        await collection.deleteOne({ _id: chat._id });
        duplicatesDeleted++;
      }
    }
    console.log('[MIGRATE] Deleted', duplicatesDeleted, 'duplicate chats');

    // Step 5: Create new indexes
    // Regular indexes for efficient queries
    try {
      await collection.createIndex({ participants: 1 }, { name: 'participants_1' });
      console.log('[MIGRATE] Created index on participants');
    } catch (createError) {
      if (createError.code !== 85) { // 85 = IndexOptionsConflict
        console.log('[MIGRATE] Error creating participants index:', createError.message);
      }
    }

    try {
      await collection.createIndex({ user1: 1 }, { name: 'user1_1' });
      console.log('[MIGRATE] Created index on user1');
    } catch (createError) {
      if (createError.code !== 85) {
        console.log('[MIGRATE] Error creating user1 index:', createError.message);
      }
    }

    try {
      await collection.createIndex({ user2: 1 }, { name: 'user2_1' });
      console.log('[MIGRATE] Created index on user2');
    } catch (createError) {
      if (createError.code !== 85) {
        console.log('[MIGRATE] Error creating user2 index:', createError.message);
      }
    }

    // Unique compound index on user1/user2
    try {
      await collection.createIndex(
        { user1: 1, user2: 1 },
        { unique: true, name: 'user1_1_user2_1_unique' }
      );
      console.log('[MIGRATE] Created unique index on user1/user2');
    } catch (createError) {
      if (createError.code === 85) { // 85 = IndexOptionsConflict
        console.log('[MIGRATE] Unique index on user1/user2 already exists');
      } else {
        console.error('[MIGRATE] Error creating unique index:', createError.message);
      }
    }

    // Summary
    const finalCount = await collection.countDocuments();
    console.log('[MIGRATE] Migration complete!');
    console.log('[MIGRATE] Summary:');
    console.log('  - Updated', updated, 'chats with user1/user2');
    console.log('  - Deleted', deleted, 'invalid chats');
    console.log('  - Deleted', duplicatesDeleted, 'duplicate chats');
    console.log('  - Total chats remaining:', finalCount);
    console.log('  - Unique index on user1/user2 created');

    logger.info('[MIGRATE] Chat migration to user1/user2 completed successfully', {
      updated,
      deleted,
      duplicatesDeleted,
      totalChats: finalCount,
    });
  } catch (error) {
    console.error('[MIGRATE] Error during migration:', error.message);
    logger.error('[MIGRATE] Migration failed', {
      error: error.message,
      stack: error.stack,
    });
    // Don't crash server if migration fails
    throw error; // Re-throw so caller knows migration failed
  }
};

// Note: This script is designed to be imported and called from server.js
// For standalone execution, ensure mongoose is connected first:
//   import connectDB from './config/db.js';
//   await connectDB();
//   await migrateChatsToUserPair();
