const express  = require('express');
const router   = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool, getActiveResume } = require('../db');
const { scrapeJobs }              = require('../services/apify');
const { scoreJobsAgainstResume }  = require('../services/gemini');

async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// ─── POST /api/jobs/fetch ──────────────────────────────────────────────────
router.post('/fetch', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { searchMode = 'resume', manualQuery = '' } = req.body;
    const activeResume = await getActiveResume(userId);

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
        error: 'No resume uploaded and no manual query provided.'
      });
    }

    console.log('🕷️ Scraping jobs from platforms...');
    const scrapedJobs = await scrapeJobs(queriesToUse);
    console.log(`📦 Scraped ${scrapedJobs.length} jobs`);

    let newAdded = 0;
    const analysis = activeResume?.analysis;

    if (searchMode === 'resume' && activeResume && scrapedJobs.length > 0) {
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
      // Manual mode — save without scoring, resume_id = null
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
            userId, null, job.external_id, job.title, job.company, job.location,
            job.is_remote, job.job_type, job.description, job.apply_url, job.source,
            job.salary_display, job.posted_at,
            0, 'Manual search — click Get Score to score this job.', '', []
          ]);
          if (result.rowCount > 0) newAdded++;
        } catch (e) { /* skip duplicate */ }
      }
    }

    await pool.query(`
      INSERT INTO fetch_history (user_id, resume_id, queries_used, total_scraped, new_added, search_mode, manual_query)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, resumeId, queriesToUse, scrapedJobs.length, newAdded, searchMode, manualQuery || null]);

    res.json({ success: true, totalScraped: scrapedJobs.length, newAdded, skipped: scrapedJobs.length - newAdded });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs ─────────────────────────────────────────────────────────
router.get('/', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { minScore = 0, remote, source, sort = 'score', limit = 100, filter } = req.query;

    let query = `
      SELECT j.*,
        CASE WHEN jt.id IS NOT NULL THEN true ELSE false END as has_tailoring,
        jt.ats_score_before, jt.ats_score_after,
        jt.sections as tailoring_sections,
        EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='applied') as is_applied,
        EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='skipped') as is_skipped,
        EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='saved')   as is_saved,
        (SELECT ja2.skip_reason FROM job_actions ja2 WHERE ja2.user_id=$1 AND ja2.job_id=j.id AND ja2.action_type='skipped' LIMIT 1) as action_skip_reason
      FROM jobs j
      LEFT JOIN job_tailoring jt ON jt.job_id = j.id AND jt.user_id = j.user_id
      WHERE j.user_id = $1
    `;
    const params = [userId];
    let idx = 2;

    // Filter by action type
    if (filter === 'applied') {
      query += ` AND EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='applied')`;
    } else if (filter === 'skipped') {
      query += ` AND EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='skipped')`;
    } else if (filter === 'saved') {
      query += ` AND EXISTS (SELECT 1 FROM job_actions ja WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type='saved')`;
    } else if (filter === 'strong_fit') {
      query += ` AND j.fit_score >= 80`;
    }
    // Default: show all jobs (no status filter — Jobs page manages its own view)

    // Only apply minScore filter to scored jobs (resume_id not null)
    if (parseInt(minScore) > 0) {
      query += ` AND (j.resume_id IS NULL OR j.fit_score >= $${idx++})`;
      params.push(parseInt(minScore));
    }

    if (remote === 'true') { query += ` AND j.is_remote = true`; }
    if (source && source !== 'all') { query += ` AND j.source = $${idx++}`; params.push(source); }

    const orderMap = { score: 'j.fit_score DESC', newest: 'j.fetched_at DESC', company: 'j.company ASC' };
    query += ` ORDER BY ${orderMap[sort] || 'j.fit_score DESC'} LIMIT $${idx}`;
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
      `SELECT j.*,
        jt.ats_score_before, jt.ats_score_after,
        jt.sections as tailoring_sections, jt.updated_at as tailored_at
       FROM jobs j
       LEFT JOIN job_tailoring jt ON jt.job_id = j.id AND jt.user_id = j.user_id
       WHERE j.user_id = $1 AND j.status = 'applied'
       ORDER BY j.applied_at DESC`,
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
      `SELECT j.*,
        jt.ats_score_before, jt.ats_score_after,
        jt.sections as tailoring_sections
       FROM jobs j
       LEFT JOIN job_tailoring jt ON jt.job_id = j.id AND jt.user_id = j.user_id
       WHERE j.user_id = $1 AND j.status = 'skipped'
       ORDER BY j.fetched_at DESC`,
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
      SELECT source, COUNT(*) AS count FROM jobs
      WHERE user_id = $1 GROUP BY source ORDER BY count DESC
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
    const result = await pool.query(
      `SELECT * FROM fetch_history WHERE user_id = $1 ORDER BY fetched_at DESC LIMIT 10`,
      [userId]
    );
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
    // Remove any previous apply record, then insert fresh
    await pool.query(
      `DELETE FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='applied'`,
      [userId, req.params.id]
    );
    await pool.query(
      `INSERT INTO job_actions (user_id, job_id, action_type) VALUES ($1, $2, 'applied')`,
      [userId, req.params.id]
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
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE jobs SET status = 'skipped', skip_reason = $3 WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId, reason || null]
    );
    // Remove previous skip record and insert fresh
    await pool.query(
      `DELETE FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='skipped'`,
      [userId, req.params.id]
    );
    await pool.query(
      `INSERT INTO job_actions (user_id, job_id, action_type, skip_reason) VALUES ($1, $2, 'skipped', $3)`,
      [userId, req.params.id, reason || null]
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
    await pool.query(
      `DELETE FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='skipped'`,
      [userId, req.params.id]
    );
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/jobs/:id/save ──────────────────────────────────────────────
router.post('/:id/save', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const jobId  = req.params.id;
    const existing = await pool.query(
      `SELECT id FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='saved'`,
      [userId, jobId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `DELETE FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='saved'`,
        [userId, jobId]
      );
      return res.json({ success: true, saved: false });
    }
    await pool.query(
      `INSERT INTO job_actions (user_id, job_id, action_type) VALUES ($1, $2, 'saved')`,
      [userId, jobId]
    );
    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/jobs/:id/restore ───────────────────────────────────────────
router.post('/:id/restore', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    await pool.query(
      `DELETE FROM job_actions WHERE user_id=$1 AND job_id=$2 AND action_type='skipped'`,
      [userId, req.params.id]
    );
    await pool.query(
      `UPDATE jobs SET status = 'new', skip_reason = NULL WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/score ────────────────────────────────────────────
router.patch('/:id/score', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!jobResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    const job = jobResult.rows[0];

    const resume = await getActiveResume(userId);
    if (!resume) {
      return res.status(400).json({ success: false, error: 'No resume uploaded. Upload a resume first to get job scores.' });
    }

    const scores = await scoreJobsAgainstResume([job], resume.analysis);
    const score = scores[0];

    await pool.query(
      `UPDATE jobs SET fit_score = $1, fit_reason = $2, fit_highlights = $3, match_skills = $4, resume_id = $5
       WHERE id = $6 AND user_id = $7`,
      [score.fit_score, score.fit_reason, score.fit_highlights, score.match_skills || [], resume.id, req.params.id, userId]
    );

    res.json({
      success: true,
      fit_score: score.fit_score,
      fit_reason: score.fit_reason,
      fit_highlights: score.fit_highlights,
      match_skills: score.match_skills || [],
    });
  } catch (err) {
    console.error('Score job error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/saved-optimizations ───────────────────────────────────
router.get('/saved-optimizations', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `SELECT j.id, j.title, j.company, j.location, j.source, j.fit_score, j.apply_url, j.status,
        jt.ats_score_before, jt.ats_score_after, jt.sections, jt.updated_at as saved_at
       FROM job_tailoring jt
       JOIN jobs j ON j.id = jt.job_id
       WHERE jt.user_id = $1
       ORDER BY jt.updated_at DESC`,
      [userId]
    );
    res.json({ success: true, optimizations: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/:id/customized-resume ──────────────────────────────────
router.get('/:id/customized-resume', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      'SELECT * FROM customized_resumes WHERE job_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    res.json({ success: true, customizedResume: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/jobs/:id/customized-resume ─────────────────────────────────
router.post('/:id/customized-resume', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { resumeData } = req.body;

    const result = await pool.query(
      `INSERT INTO customized_resumes (user_id, job_id, resume_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, job_id) DO UPDATE
       SET resume_data = $3, updated_at = NOW()
       RETURNING *`,
      [userId, req.params.id, JSON.stringify(resumeData)]
    );
    res.json({ success: true, customizedResume: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;