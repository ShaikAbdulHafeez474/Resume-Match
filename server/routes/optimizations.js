const express = require('express');
const router  = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool } = require('../db');

async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// GET /api/optimizations
router.get('/', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { search } = req.query;

    let query = `
      SELECT jt.id, jt.ats_score_before, jt.ats_score_after, jt.sections,
             jt.missing_keywords, jt.created_at, jt.updated_at,
             j.id as job_id, j.title, j.company, j.location, j.apply_url
      FROM job_tailoring jt
      JOIN jobs j ON jt.job_id = j.id
      WHERE jt.user_id = $1
    `;
    const params = [userId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (j.title ILIKE $${params.length} OR j.company ILIKE $${params.length})`;
    }

    query += ` ORDER BY jt.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ optimizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/optimizations/:id
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);

    const result = await pool.query(
      `SELECT jt.*, j.title, j.company, j.location, j.apply_url, j.description
       FROM job_tailoring jt
       JOIN jobs j ON jt.job_id = j.id
       WHERE jt.id = $1 AND jt.user_id = $2`,
      [req.params.id, userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
