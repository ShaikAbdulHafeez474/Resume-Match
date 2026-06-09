const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// ── Admin key middleware ────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

router.use(adminAuth);

// ── GET /api/admin/users ────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let query  = `SELECT id, name, email, plan, plan_started_at, plan_expires_at,
                         fetch_count, score_count, tailor_count, created_at
                  FROM users`;
    const params = [];
    if (search) {
      query += ` WHERE email ILIKE $1`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/admin/users/:id/plan ────────────────────────────────────────
router.patch('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan = 'free', days = 30 } = req.body;
    if (!['free', 'pro', 'elite'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    await pool.query(
      `UPDATE users
       SET plan=$1,
           plan_started_at=NOW(),
           plan_expires_at = CASE WHEN $1='free' THEN NULL ELSE NOW() + ($2::integer * INTERVAL '1 day') END,
           fetch_count=0, score_count=0, tailor_count=0, usage_reset_at=NOW()
       WHERE id=$3`,
      [plan, days, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/admin/users/:id/plan ───────────────────────────────────────
router.delete('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE users SET plan='free', plan_expires_at=NULL, plan_started_at=NULL WHERE id=$1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE TRUE)               AS total,
        COUNT(*) FILTER (WHERE plan='free')         AS free_count,
        COUNT(*) FILTER (WHERE plan='pro')          AS pro_count,
        COUNT(*) FILTER (WHERE plan='elite')        AS elite_count
      FROM users
    `);
    const { total, free_count, pro_count, elite_count } = result.rows[0];
    const mrr = parseInt(pro_count) * 9 + parseInt(elite_count) * 19;
    res.json({ success: true, total: parseInt(total), free_count: parseInt(free_count), pro_count: parseInt(pro_count), elite_count: parseInt(elite_count), mrr });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
