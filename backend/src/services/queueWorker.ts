import { pool } from '../config/db.js';
import { processAndStore } from '../routes/submissionRoutes.js';

const BATCH_SIZE = Number(process.env.QUEUE_BATCH_SIZE) || 500;
const CONCURRENCY = Number(process.env.QUEUE_CONCURRENCY) || 50;

let isPolling = false;

export async function pollQueue() {
  if (isPolling) return;
  isPolling = true;

  let hasMore = false;
  try {
    // Read up to BATCH_SIZE messages from pgmq with a visibility timeout of 30 seconds
    const { rows: messages } = await pool.query(
      `SELECT * FROM pgmq.read('form_queue', 30, $1)`,
      [BATCH_SIZE]
    );

    if (messages.length === 0) {
      isPolling = false;
      return;
    }

    console.log(`📥 [queue-worker] Pulled ${messages.length} messages from form_queue`);

    // If we received a full batch, there might be more messages waiting
    if (messages.length === BATCH_SIZE) {
      hasMore = true;
    }

    // Process messages in parallel chunks of CONCURRENCY size
    for (let i = 0; i < messages.length; i += CONCURRENCY) {
      const chunk = messages.slice(i, i + CONCURRENCY);
      
      await Promise.all(chunk.map(async (msg) => {
        const msgId = msg.msg_id;
        const data = msg.message; // JSON payload containing submission_id, form_type, payload, client_id

        const submissionId = Number(data.submission_id);
        const formType = data.form_type;
        const clientPayload = data.payload;
        const clientId = Number(data.client_id) || 1;

        try {
          // 1. Insert into submissions using the pre-allocated submissionId
          await pool.query(`
            INSERT INTO submissions (id, form_type, payload, client_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
          `, [submissionId, formType, JSON.stringify(clientPayload), clientId]);

          // 2. Run the preprocessing/sentiment pipeline
          await processAndStore(submissionId, formType, clientPayload, clientId);

          // 3. Delete from pgmq to purge the message instantly
          await pool.query(`SELECT * FROM pgmq.delete('form_queue', $1::bigint)`, [msgId]);

        } catch (err: any) {
          console.error(`❌ [queue-worker] Failed to process message ${msgId}:`, err.message);
        }
      }));
    }

    console.log(`✅ [queue-worker] Processed batch of ${messages.length} messages`);

  } catch (err: any) {
    console.error(`❌ [queue-worker] Error polling queue:`, err.message);
  } finally {
    isPolling = false;
    // If we processed a full batch, check for more messages immediately (greedy polling)
    if (hasMore) {
      setImmediate(pollQueue);
    }
  }
}

export function startQueueWorker(intervalMs = 3000) {
  console.log(`📥 [queue-worker] Starting background worker (polling every ${intervalMs}ms, batch size ${BATCH_SIZE}, concurrency ${CONCURRENCY})...`);
  setInterval(pollQueue, intervalMs);
}
