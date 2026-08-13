const cron = require('node-cron');
const { Task, Document } = require('../models');
const s3 = require('../utils/s3');

/**
 * Worker that runs daily at midnight to clean up resources.
 * For example: Deletes S3 documents associated with Tasks that have been
 * marked as "Done" for over 30 days.
 */
const startWorker = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[CleanupWorker] Starting daily cleanup task...');
    try {
      // 1. Identify tasks completed over 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldTasks = await Task.find({
        status: 'Done',
        completedAt: { $lte: thirtyDaysAgo },
      }).select('_id');

      const taskIds = oldTasks.map((t) => t._id);

      if (taskIds.length === 0) {
        console.log('[CleanupWorker] No old tasks to clean up today.');
        return;
      }

      // 2. Find all documents attached to these tasks
      const documentsToDelete = await Document.find({
        task: { $in: taskIds },
      });

      if (documentsToDelete.length === 0) {
        console.log(`[CleanupWorker] Found ${taskIds.length} old tasks, but no documents to delete.`);
        return;
      }

      console.log(`[CleanupWorker] Found ${documentsToDelete.length} documents to delete.`);

      // 3. Delete from S3 and from Database
      let deletedCount = 0;
      let errorCount = 0;

      for (const doc of documentsToDelete) {
        try {
          // Delete from Vultr S3
          await s3.deleteFromS3(doc.url);
          // Hard delete the document record from the DB
          await Document.findByIdAndDelete(doc._id);
          deletedCount++;
        } catch (err) {
          console.error(`[CleanupWorker] Failed to delete document ${doc._id} from S3:`, err.message);
          errorCount++;
        }
      }

      console.log(
        `[CleanupWorker] Cleanup complete. Successfully deleted ${deletedCount} documents. Errors: ${errorCount}.`
      );
    } catch (error) {
      console.error('[CleanupWorker] Error during cleanup execution:', error);
    }
  });

  console.log('Cleanup worker initialized.');
};

module.exports = {
  startWorker,
};
