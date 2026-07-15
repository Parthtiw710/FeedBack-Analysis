import pkg from "pg";
import { startQueueWorker } from '../services/queueWorker.server.js';

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX) || 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 18000,
});

// Test connection
pool.query("SELECT NOW()")
  .then(async () => {
    console.log("✅ Connected to PostgreSQL");
    await initializeTables();
    startQueueWorker();
  })
  .catch((err: any) => {
    console.error("❌ Database connection error:", err.message);
  });

// =========================
// INIT TABLES
// =========================
async function initializeTables() {
  try {
    // PROFILES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        billing_id INT DEFAULT 0 CHECK (billing_id IN (0,1,2,3)),
        api_keys TEXT[] DEFAULT '{}'
      );
    `);

    // Migration: add api_keys to existing profiles table (no-op if already exists)
    await pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_keys TEXT[] DEFAULT '{}';
    `);


    // SUBMISSIONS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        form_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE
      );
    `);

    // PROCESSED SUBMISSIONS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_submissions (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
        form_type TEXT NOT NULL,
        score_primary NUMERIC,
        score_secondary NUMERIC,
        score_tertiary NUMERIC,
        nps_segment TEXT,
        category TEXT,
        sub_category TEXT,
        priority TEXT,
        sentiment_label TEXT,
        boolean_flag BOOLEAN,
        scores JSONB,
        categories JSONB,
        freetext JSONB,
        derived JSONB,
        clean_payload JSONB,
        processed_at TIMESTAMPTZ DEFAULT NOW(),
        client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE
      );
    `);

    // INDEXES FOR PROCESSED SUBMISSIONS
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_submission_id 
      ON processed_submissions(submission_id);

      CREATE INDEX IF NOT EXISTS idx_proc_form_type  
      ON processed_submissions(form_type);

      CREATE INDEX IF NOT EXISTS idx_proc_sub_id     
      ON processed_submissions(submission_id);

      CREATE INDEX IF NOT EXISTS idx_proc_score      
      ON processed_submissions(score_primary);

      CREATE INDEX IF NOT EXISTS idx_proc_nps        
      ON processed_submissions(nps_segment);

      CREATE INDEX IF NOT EXISTS idx_proc_priority   
      ON processed_submissions(priority);

      CREATE INDEX IF NOT EXISTS idx_proc_category   
      ON processed_submissions(category);

      CREATE INDEX IF NOT EXISTS idx_proc_at         
      ON processed_submissions(processed_at);

      CREATE INDEX IF NOT EXISTS idx_proc_sentiment  
      ON processed_submissions(sentiment_label);

      CREATE INDEX IF NOT EXISTS idx_proc_scores_gin 
      ON processed_submissions USING GIN(scores);

      CREATE INDEX IF NOT EXISTS idx_proc_cats_gin   
      ON processed_submissions USING GIN(categories);
    `);

    // AI INSIGHTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id SERIAL PRIMARY KEY,
        batch_id TEXT NOT NULL,
        form_type TEXT,
        insight_type TEXT,
        content JSONB NOT NULL,
        submission_ids INTEGER[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE
      );
    `);

    // INDEXES FOR AI INSIGHTS
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_client_batch
      ON ai_insights(client_id, batch_id);

      CREATE INDEX IF NOT EXISTS idx_ai_type
      ON ai_insights(insight_type);

      CREATE INDEX IF NOT EXISTS idx_ai_content
      ON ai_insights USING GIN (content);
    `);

    // USER SESSIONS (for express-session)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL,
        client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE
      );
    `);

    // INDEXES FOR SUBMISSIONS
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sub_client
      ON submissions(client_id);

      CREATE INDEX IF NOT EXISTS idx_sub_form_type
      ON submissions(form_type);

      CREATE INDEX IF NOT EXISTS idx_proc_client
      ON processed_submissions(client_id);
    `);

    // ── Migrations: safely add columns to existing tables ──────────────────
    // These are no-ops if the column already exists
    await pool.query(`
      ALTER TABLE processed_submissions
        ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE;
    `);

    await pool.query(`
      ALTER TABLE ai_insights
        ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE;
    `);

    // Backfill client_id on processed_submissions from parent submissions row
    await pool.query(`
      UPDATE processed_submissions ps
      SET client_id = s.client_id
      FROM submissions s
      WHERE ps.submission_id = s.id
        AND ps.client_id IS NULL
        AND s.client_id IS NOT NULL;
    `);

    // Ensure pgmq queue exists
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'form_queue') THEN
            PERFORM pgmq.create('form_queue');
          END IF;
        END $$;
      `);
      console.log("✅ pgmq 'form_queue' queue verified/created");
    } catch (queueErr: any) {
      console.warn("⚠️ pgmq initialization skipped/failed: ", queueErr.message);
    }

    console.log("✅ Database tables initialized");
  } catch (err: any) {
    console.error("❌ Table initialization error:", err.message);
  }
}