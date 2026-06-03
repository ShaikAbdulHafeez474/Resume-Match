const express = require('express');
const router  = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool } = require('../db');
const { computeResumeHealth } = require('../utils/resumeHealth');

async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// GET /api/dashboard/stats
router.get('/stats', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const appliedRes = await pool.query(
      `SELECT COUNT(DISTINCT job_id) as count FROM job_actions
       WHERE user_id=$1 AND action_type='applied'`,
      [userId]
    );

    const optRes = await pool.query(
      `SELECT COUNT(*) as count,
              AVG(ats_score_after - ats_score_before) as avg_improvement
       FROM job_tailoring
       WHERE user_id=$1 AND ats_score_before IS NOT NULL AND ats_score_after IS NOT NULL
         AND ats_score_before > 0`,
      [userId]
    );

    const strongFitRes = await pool.query(
      `SELECT COUNT(*) as count FROM jobs j
       WHERE j.user_id=$1 AND j.fit_score >= 80
         AND NOT EXISTS (
           SELECT 1 FROM job_actions ja
           WHERE ja.user_id=$1 AND ja.job_id=j.id AND ja.action_type IN ('skipped','applied')
         )`,
      [userId]
    );

    const resumeRes = await pool.query(
      `SELECT analysis FROM resumes WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const resumeHealth = resumeRes.rows[0]?.analysis
      ? computeResumeHealth(resumeRes.rows[0].analysis)
      : null;

    const avgImprovement = optRes.rows[0].avg_improvement
      ? Math.round(parseFloat(optRes.rows[0].avg_improvement))
      : null;

    res.json({
      applications:        parseInt(appliedRes.rows[0].count) || 0,
      savedOptimizations:  parseInt(optRes.rows[0].count)    || 0,
      avgAtsImprovement:   avgImprovement,
      strongFitJobs:       parseInt(strongFitRes.rows[0].count) || 0,
      resumeHealth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const actionsRes = await pool.query(
      `SELECT ja.action_type, ja.skip_reason, ja.created_at, j.title, j.company
       FROM job_actions ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE ja.user_id = $1
       ORDER BY ja.created_at DESC LIMIT 5`,
      [userId]
    );

    const optRes = await pool.query(
      `SELECT jt.created_at, j.title, j.company
       FROM job_tailoring jt
       JOIN jobs j ON jt.job_id = j.id
       WHERE jt.user_id = $1
       ORDER BY jt.created_at DESC LIMIT 5`,
      [userId]
    );

    const activities = [];
    actionsRes.rows.forEach(r => {
      activities.push({
        type:      r.action_type,
        title:     r.title,
        company:   r.company,
        reason:    r.skip_reason,
        timestamp: r.created_at,
      });
    });
    optRes.rows.forEach(r => {
      activities.push({
        type:      'optimized',
        title:     r.title,
        company:   r.company,
        timestamp: r.created_at,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ activities: activities.slice(0, 8) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/ats-trend
router.get('/ats-trend', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const result = await pool.query(
      `SELECT jt.ats_score_before, jt.ats_score_after, jt.created_at, j.title
       FROM job_tailoring jt
       JOIN jobs j ON jt.job_id = j.id
       WHERE jt.user_id = $1
         AND jt.ats_score_before IS NOT NULL AND jt.ats_score_after IS NOT NULL
         AND jt.ats_score_before > 0
       ORDER BY jt.created_at ASC`,
      [userId]
    );

    const avgBefore = result.rows.length > 0
      ? Math.round(result.rows.reduce((s, r) => s + r.ats_score_before, 0) / result.rows.length)
      : null;
    const avgAfter = result.rows.length > 0
      ? Math.round(result.rows.reduce((s, r) => s + r.ats_score_after, 0) / result.rows.length)
      : null;

    res.json({
      trend: result.rows.map(r => ({
        date:   r.created_at,
        before: r.ats_score_before,
        after:  r.ats_score_after,
        title:  r.title,
      })),
      avgBefore,
      avgAfter,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/top-skills
router.get('/top-skills', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const result = await pool.query(
      `SELECT missing_keywords FROM job_tailoring
       WHERE user_id=$1 AND missing_keywords IS NOT NULL`,
      [userId]
    );

    const skillCount = {};
    result.rows.forEach(row => {
      const kws = Array.isArray(row.missing_keywords) ? row.missing_keywords : [];
      kws.forEach(kw => {
        const k = kw.toLowerCase().trim();
        if (k) skillCount[k] = (skillCount[k] || 0) + 1;
      });
    });

    const total = result.rows.length || 1;
    const skills = Object.entries(skillCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({
        skill,
        pct: Math.min(Math.round((count / total) * 100), 99),
      }));

    res.json({ skills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
