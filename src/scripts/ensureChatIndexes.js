import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Ensure Chat collection has correct partial unique index
 * This prevents duplicate chats with ad:null while allowing multiple chats with valid ad ObjectIds
 * 
 * Runs once on server startup after DB connection
 */
export const ensureChatIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log('[INDEX] MongoDB connection not ready, skipping index creation');
      return;
    }

    const collection = db.collection('chats');
    
    // Get existing indexes
    const existingIndexes = await collection.indexes();
    
    // Find old unique index on { ad: 1, participantsKey: 1 } without partial filter
    const oldIndex = existingIndexes.find(
      (idx) => idx.key && 
               idx.key.ad === 1 && 
               idx.key.participantsKey === 1 && 
               idx.unique &&
               !idx.partialFilterExpression // Only match if it doesn't have partial filter
    );

    // Drop old unique index if it exists (without partial filter)
    if (oldIndex) {
      try {
        const indexName = oldIndex.name;
        await collection.dropIndex(indexName);
        console.log('[INDEX] Dropped old unique index:', indexName);
        logger.info('[INDEX] Dropped old unique index', { indexName });
      } catch (dropError) {
        // Index might not exist or already dropped
        if (dropError.code !== 27) { // 27 = IndexNotFound
          console.log('[INDEX] Error dropping old index:', dropError.message);
        }
      }
    }

    // Create new partial unique index (only applies when ad is ObjectId)
    try {
      await collection.createIndex(
        { ad: 1, participantsKey: 1 },
        {
          unique: true,
          partialFilterExpression: { ad: { $type: 'objectId' } },
          name: 'ad_1_participantsKey_1_partial',
        }
      );
      console.log('[INDEX] Created partial unique index: ad_1_participantsKey_1_partial');
      logger.info('[INDEX] Chat collection index updated successfully', {
        index: 'ad_1_participantsKey_1_partial',
        type: 'partial_unique',
      });
    } catch (createError) {
      // Index might already exist
      if (createError.code === 85) { // 85 = IndexOptionsConflict
        console.log('[INDEX] Partial unique index already exists, skipping creation');
      } else {
        console.error('[INDEX] Error creating partial unique index:', createError.message);
        logger.error('[INDEX] Failed to create partial unique index', {
          error: createError.message,
        });
      }
    }
  } catch (error) {
    console.error('[INDEX] Error ensuring chat indexes:', error.message);
    logger.error('[INDEX] Failed to ensure chat indexes', {
      error: error.message,
      stack: error.stack,
    });
    // Don't crash server if index creation fails
  }
};
