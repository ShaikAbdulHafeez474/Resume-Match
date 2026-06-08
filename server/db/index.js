const { Pool } = require('pg');
const crypto = require('crypto');

const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');
const isSSL  = (process.env.DATABASE_URL || '').includes('sslmode=require') || isNeon;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      clerk_id          VARCHAR(255) UNIQUE NOT NULL,
      email             VARCHAR(255),
      name              VARCHAR(255),
      last_search_mode  VARCHAR(20) DEFAULT 'resume',
      created_at        TIMESTAMP DEFAULT NOW(),
      last_seen         TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      filename       VARCHAR(255),
      content_hash   VARCHAR(64),
      raw_text       TEXT,
      analysis       JSONB,
      search_queries TEXT[],
      is_active      BOOLEAN DEFAULT true,
      created_at     TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, content_hash)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
      resume_id      INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
      external_id    VARCHAR(255),
      title          VARCHAR(500),
      company        VARCHAR(255),
      location       VARCHAR(255),
      is_remote      BOOLEAN DEFAULT false,
      job_type       VARCHAR(100),
      description    TEXT,
      apply_url      TEXT,
      source         VARCHAR(100),
      salary_display VARCHAR(255),
      posted_at      VARCHAR(255),
      fit_score      INTEGER DEFAULT 0,
      fit_reason     TEXT,
      fit_highlights TEXT,
      match_skills   TEXT[],
      status         VARCHAR(50) DEFAULT 'new',
      applied_at     TIMESTAMP,
      fetched_at     TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS fetch_history (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      resume_id     INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
      fetched_at    TIMESTAMP DEFAULT NOW(),
      queries_used  TEXT[],
      total_scraped INTEGER DEFAULT 0,
      new_added     INTEGER DEFAULT 0,
      search_mode   VARCHAR(20) DEFAULT 'resume',
      manual_query  VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS job_tailoring (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
      job_id           INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      jd_text          TEXT,
      ats_score_before INTEGER DEFAULT 0,
      ats_score_after  INTEGER DEFAULT 0,
      sections         JSONB NOT NULL DEFAULT '{}',
      created_at       TIMESTAMP DEFAULT NOW(),
      updated_at       TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS job_actions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      action_type VARCHAR(50) NOT NULL,
      skip_reason VARCHAR(255),
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_job_actions_user_job  ON job_actions(user_id, job_id);
    CREATE INDEX IF NOT EXISTS idx_job_actions_user_type ON job_actions(user_id, action_type);

    CREATE TABLE IF NOT EXISTS skills_frequency (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      skill_name VARCHAR(255) NOT NULL,
      frequency  INTEGER DEFAULT 1,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, skill_name)
    );

    CREATE INDEX IF NOT EXISTS idx_skills_frequency_user ON skills_frequency(user_id, frequency DESC);
  `);

  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skip_reason VARCHAR(255)`);
  await pool.query(`ALTER TABLE job_tailoring ADD COLUMN IF NOT EXISTS missing_keywords JSONB`);

  console.log('✅ Database ready');
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function findOrCreateUser(clerkId, email, name) {
  const existing = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
  if (existing.rows.length > 0) {
    await pool.query('UPDATE users SET last_seen = NOW(), email = $2, name = $3 WHERE clerk_id = $1', [clerkId, email, name]);
    return existing.rows[0];
  }
  const result = await pool.query(`INSERT INTO users (clerk_id, email, name) VALUES ($1, $2, $3) RETURNING *`, [clerkId, email, name]);
  return result.rows[0];
}

async function getActiveResume(userId) {
  const result = await pool.query(
    `SELECT * FROM resumes WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function deactivateResumes(userId) {
  await pool.query('UPDATE resumes SET is_active = false WHERE user_id = $1', [userId]);
}

module.exports = { pool, initDB, hashText, findOrCreateUser, getActiveResume, deactivateResumes };