const express = require('express');
const router  = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { findOrCreateUser } = require('../db');

// POST /api/auth/sync
// Called on every login/page load to sync Clerk user with our DB
// Frontend calls this after Clerk auth is ready
router.post('/sync', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const { email, name } = req.body;

    const user = await findOrCreateUser(clerkId, email, name);

    res.json({ success: true, user: {
      id:       user.id,
      clerkId:  user.clerk_id,
      email:    user.email,
      name:     user.name,
      lastSeen: user.last_seen,
    }});
  } catch (err) {
    console.error('Auth sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
// Get current user's DB record
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const { pool } = require('../db');
    const result = await pool.query(
      'SELECT * FROM users WHERE clerk_id = $1', [clerkId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;