import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Cleanup script: Remove broken chats and drop wrong unique indexes
 * - Deletes chats where user1 or user2 is null
 * - Deletes chats with missing or invalid participants
 * - Drops any unique indexes on user1/user2 or participants
 * 
 * Run this once manually or on server startup
 */
export const cleanupBrokenChats = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log('[CLEANUP] MongoDB connection not ready, skipping cleanup');
      return;
    }

    const collection = db.collection('chats');
    
    console.log('[CLEANUP] Starting cleanup of broken chats...');

    // Step 1: Get all existing indexes
    const existingIndexes = await collection.indexes();
    console.log('[CLEANUP] Found', existingIndexes.length, 'indexes');

    // Step 2: Drop wrong unique indexes
    const indexesToDrop = existingIndexes.filter((idx) => {
      if (!idx.key) return false;
      // Drop indexes that are unique on user1/user2 or participants
      if (idx.unique) {
        const keys = Object.keys(idx.key);
        return keys.includes('user1') || keys.includes('user2') || keys.includes('participants');
      }
      return false;
    });

    let droppedCount = 0;
    for (const index of indexesToDrop) {
      try {
        // Skip _id index
        if (index.name === '_id_') continue;
        await collection.dropIndex(index.name);
        console.log('[CLEANUP] Dropped unique index:', index.name);
        droppedCount++;
      } catch (dropError) {
        if (dropError.code !== 27) { // 27 = IndexNotFound
          console.log('[CLEANUP] Error dropping index', index.name, ':', dropError.message);
        }
      }
    }

    // Step 3: Delete broken chats
    // Delete where user1 is null OR user2 is null
    const deleteResult1 = await collection.deleteMany({
      $or: [
        { user1: null },
        { user2: null },
      ],
    });
    console.log('[CLEANUP] Deleted', deleteResult1.deletedCount, 'chats with null user1 or user2');

    // Delete where participants missing or length != 2
    const deleteResult2 = await collection.deleteMany({
      $or: [
        { participants: { $exists: false } },
        { participants: null },
        { $expr: { $ne: [{ $size: { $ifNull: ['$participants', []] } }, 2] } },
      ],
    });
    console.log('[CLEANUP] Deleted', deleteResult2.deletedCount, 'chats with invalid participants');

    const totalDeleted = deleteResult1.deletedCount + deleteResult2.deletedCount;

    // Summary
    const finalCount = await collection.countDocuments();
    console.log('[CLEANUP] Cleanup complete!');
    console.log('[CLEANUP] Summary:');
    console.log('  - Dropped', droppedCount, 'unique indexes');
    console.log('  - Deleted', totalDeleted, 'broken chats');
    console.log('  - Total chats remaining:', finalCount);

    logger.info('[CLEANUP] Broken chats cleanup completed successfully', {
      droppedIndexes: droppedCount,
      deletedChats: totalDeleted,
      totalChats: finalCount,
    });
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error.message);
    logger.error('[CLEANUP] Cleanup failed', {
      error: error.message,
      stack: error.stack,
    });
    // Don't crash server if cleanup fails
    throw error; // Re-throw so caller knows cleanup failed
  }
};

// Note: This script is designed to be imported and called from server.js
// For standalone execution, ensure mongoose is connected first:
//   import connectDB from './config/db.js';
//   await connectDB();
//   await cleanupBrokenChats();
