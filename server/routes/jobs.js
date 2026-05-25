const express  = require('express');
const router   = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool, getActiveResume } = require('../db');
const { scrapeJobs }              = require('../services/apify');
const { scoreJobsAgainstResume }  = require('../services/gemini');

// Helper — get DB userId from Clerk
async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// ─── POST /api/jobs/fetch ──────────────────────────────────────────────────
// Fetch new jobs — additive, never replaces existing
// Works with or without a resume (manual mode)
router.post('/fetch', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { searchMode = 'resume', manualQuery = '' } = req.body;

    const activeResume = await getActiveResume(userId);

    // Determine search queries
    let queriesToUse;
    let resumeId = activeResume?.id || null;

    if (searchMode === 'manual' && manualQuery.trim()) {
      const q = manualQuery.trim();
      queriesToUse = [q, `${q} India`, `${q} remote`, `${q} fresher`, `${q} engineer`];
      console.log(`🔍 Manual mode: "${q}"`);
    } else if (activeResume) {
      queriesToUse = activeResume.search_queries;
      console.log(`🔍 Resume mode: ${queriesToUse.length} queries`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'No resume uploaded and no manual query provided. Please upload a resume or enter a job title.'
      });
    }

    // Scrape jobs
    console.log('🕷️ Scraping jobs from platforms...');
    const scrapedJobs = await scrapeJobs(queriesToUse);
    console.log(`📦 Scraped ${scrapedJobs.length} jobs`);

    // Score + save
    let newAdded = 0;
    let analysis = activeResume?.analysis;

    if (searchMode === 'resume' && activeResume && scrapedJobs.length > 0) {
      // Score against resume
      console.log(`⚡ Scoring ${scrapedJobs.length} jobs...`);
      const scores = await scoreJobsAgainstResume(scrapedJobs, analysis);

      for (let i = 0; i < scrapedJobs.length; i++) {
        const job   = scrapedJobs[i];
        const score = scores[i] || { fit_score: 50, fit_reason: 'Could not score.', fit_highlights: '', match_skills: [] };
        try {
          const result = await pool.query(`
            INSERT INTO jobs (
              user_id, resume_id, external_id, title, company, location,
              is_remote, job_type, description, apply_url, source,
              salary_display, posted_at, fit_score, fit_reason,
              fit_highlights, match_skills
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (user_id, external_id) DO NOTHING
          `, [
            userId, resumeId, job.external_id, job.title, job.company, job.location,
            job.is_remote, job.job_type, job.description, job.apply_url, job.source,
            job.salary_display, job.posted_at, score.fit_score, score.fit_reason,
            score.fit_highlights, score.match_skills || []
          ]);
          if (result.rowCount > 0) newAdded++;
        } catch (e) { /* skip duplicate */ }
      }
    } else {
      // Manual mode — save without scoring
      for (const job of scrapedJobs) {
        try {
          const result = await pool.query(`
            INSERT INTO jobs (
              user_id, resume_id, external_id, title, company, location,
              is_remote, job_type, description, apply_url, source,
              salary_display, posted_at, fit_score, fit_reason, fit_highlights, match_skills
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (user_id, external_id) DO NOTHING
          `, [
            userId, resumeId, job.external_id, job.title, job.company, job.location,
            job.is_remote, job.job_type, job.description, job.apply_url, job.source,
            job.salary_display, job.posted_at,
            70, 'Fetched based on job title search.', job.title || '', []
          ]);
          if (result.rowCount > 0) newAdded++;
        } catch (e) { /* skip duplicate */ }
      }
    }

    // Save fetch history
    await pool.query(`
      INSERT INTO fetch_history (user_id, resume_id, queries_used, total_scraped, new_added, search_mode, manual_query)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, resumeId, queriesToUse, scrapedJobs.length, newAdded, searchMode, manualQuery || null]);

    res.json({
      success: true,
      totalScraped: scrapedJobs.length,
      newAdded,
      skipped: scrapedJobs.length - newAdded,
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs ─────────────────────────────────────────────────────────
router.get('/', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { minScore = 0, remote, source, sort = 'score', limit = 100 } = req.query;

    let query = `SELECT * FROM jobs WHERE user_id = $1 AND status = 'new' AND fit_score >= $2`;
    const params = [userId, parseInt(minScore)];
    let idx = 3;

    if (remote === 'true') { query += ` AND is_remote = true`; }
    if (source && source !== 'all') { query += ` AND source = $${idx++}`; params.push(source); }

    const orderMap = { score: 'fit_score DESC', newest: 'fetched_at DESC', company: 'company ASC' };
    query += ` ORDER BY ${orderMap[sort] || 'fit_score DESC'} LIMIT $${idx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ success: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/applied ─────────────────────────────────────────────────
router.get('/applied', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 AND status = 'applied' ORDER BY applied_at DESC`,
      [userId]
    );
    res.json({ success: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/skipped ─────────────────────────────────────────────────
router.get('/skipped', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 AND status = 'skipped' ORDER BY fetched_at DESC`,
      [userId]
    );
    res.json({ success: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/stats ───────────────────────────────────────────────────
router.get('/stats', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const counts = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status = 'new')               AS total_new,
        COUNT(*) FILTER (WHERE status = 'applied')           AS total_applied,
        COUNT(*) FILTER (WHERE status = 'skipped')           AS total_skipped,
        ROUND(AVG(fit_score))                                AS avg_score,
        COUNT(*) FILTER (WHERE fit_score >= 80)              AS strong_fit,
        COUNT(*) FILTER (WHERE fit_score BETWEEN 65 AND 79)  AS good_fit,
        COUNT(*) FILTER (WHERE fit_score < 45)               AS weak_fit,
        COUNT(*) FILTER (WHERE status = 'applied'
          AND applied_at >= CURRENT_DATE)                    AS applied_today
      FROM jobs WHERE user_id = $1
    `, [userId]);

    const sources = await pool.query(`
      SELECT source, COUNT(*) AS count
      FROM jobs WHERE user_id = $1
      GROUP BY source ORDER BY count DESC
    `, [userId]);

    const daily = await pool.query(`
      SELECT DATE(applied_at) AS date, COUNT(*) AS count
      FROM jobs WHERE user_id = $1 AND status = 'applied'
      AND applied_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(applied_at) ORDER BY date ASC
    `, [userId]);

    const dist = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE fit_score BETWEEN 80 AND 100) AS "80-100",
        COUNT(*) FILTER (WHERE fit_score BETWEEN 65 AND 79)  AS "65-79",
        COUNT(*) FILTER (WHERE fit_score BETWEEN 45 AND 64)  AS "45-64",
        COUNT(*) FILTER (WHERE fit_score BETWEEN 0  AND 44)  AS "0-44"
      FROM jobs WHERE user_id = $1
    `, [userId]);

    // Last fetch info
    const lastFetch = await pool.query(`
      SELECT fetched_at, new_added, total_scraped, search_mode
      FROM fetch_history WHERE user_id = $1
      ORDER BY fetched_at DESC LIMIT 1
    `, [userId]);

    const r = counts.rows[0];
    res.json({
      success: true,
      total:              parseInt(r.total),
      total_new:          parseInt(r.total_new),
      total_applied:      parseInt(r.total_applied),
      total_skipped:      parseInt(r.total_skipped),
      avg_score:          parseInt(r.avg_score) || 0,
      strong_fit:         parseInt(r.strong_fit),
      good_fit:           parseInt(r.good_fit),
      weak_fit:           parseInt(r.weak_fit),
      applied_today:      parseInt(r.applied_today),
      sources:            sources.rows,
      daily_applications: daily.rows,
      score_distribution: dist.rows[0],
      last_fetch:         lastFetch.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/fetch-history ──────────────────────────────────────────
router.get('/fetch-history', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(`
      SELECT * FROM fetch_history
      WHERE user_id = $1
      ORDER BY fetched_at DESC LIMIT 10
    `, [userId]);
    res.json({ success: true, history: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/apply ────────────────────────────────────────────
router.patch('/:id/apply', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `UPDATE jobs SET status = 'applied', applied_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/skip ─────────────────────────────────────────────
router.patch('/:id/skip', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `UPDATE jobs SET status = 'skipped' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/unskip ──────────────────────────────────────────
router.patch('/:id/unskip', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `UPDATE jobs SET status = 'new' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;