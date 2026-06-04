import { app } from './app.js';
import { runDailyBatch } from './services/pipelineService.js';
import { catchUpUnprocessed } from './routes/submissionRoutes.js';
import cron from 'node-cron';
import { pool } from './config/db.js';
import { startQueueWorker } from './services/queueWorker.js';

/* =====================================================
   DAILY SCHEDULER — 02:00 every night
   ===================================================== */
const instanceId = process.env.CLOUD_RUN_INSTANCE_ID || '0';
if (instanceId === '0' || instanceId.endsWith('-0')) {
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Daily AI batch triggered');
    try { await runDailyBatch(pool); }
    catch (err: any) { console.error('Scheduler error:', err.message); }
  });
  console.log('⏰ Daily AI batch scheduled for 02:00');
}

/* =====================================================
   START
   ===================================================== */

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Server on http://localhost:${PORT}`);
  // Auto-catchup: reprocess any submissions that are missing from processed_submissions
  // (handles DB resets, manual deletes, or crash-interrupted processing)
  setTimeout(() => catchUpUnprocessed(), 2000);
  
  // Start pgmq queue worker to poll and process queued submissions
  startQueueWorker();
});
