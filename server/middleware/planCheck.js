const { getAuth } = require('@clerk/express');
const { pool }    = require('../db');

const PLAN_LIMITS = {
  free:  { fetch_limit: 5,    score_limit: 2,    tailor_limit: 0    },
  pro:   { fetch_limit: 50,   score_limit: 9999, tailor_limit: 10   },
  elite: { fetch_limit: 9999, score_limit: 9999, tailor_limit: 9999 },
};

/**
 * Resolve the current user's plan + usage, auto-expiring or auto-resetting
 * counts as needed. Returns { plan, fetch_count, score_count, tailor_count, limits }.
 */
async function getPlan(req) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) throw new Error('Unauthenticated');

  const result = await pool.query(
    `SELECT plan, plan_expires_at, fetch_count, score_count, tailor_count, usage_reset_at
     FROM users WHERE clerk_id = $1`,
    [clerkId]
  );
  if (!result.rows.length) throw new Error('User not found');

  let { plan, plan_expires_at, fetch_count, score_count, tailor_count, usage_reset_at } = result.rows[0];

  // Auto-expire paid plan
  if (plan !== 'free' && plan_expires_at && new Date(plan_expires_at) < new Date()) {
    plan = 'free';
    await pool.query(
      `UPDATE users SET plan='free', plan_expires_at=NULL WHERE clerk_id=$1`,
      [clerkId]
    );
  }

  // Reset usage counters monthly
  const resetAt = usage_reset_at ? new Date(usage_reset_at) : new Date(0);
  const daysSinceReset = (Date.now() - resetAt.getTime()) / 86400000;
  if (daysSinceReset > 30) {
    fetch_count = 0; score_count = 0; tailor_count = 0;
    await pool.query(
      `UPDATE users SET fetch_count=0, score_count=0, tailor_count=0, usage_reset_at=NOW() WHERE clerk_id=$1`,
      [clerkId]
    );
  }

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return { plan, fetch_count, score_count, tailor_count, limits };
}

/**
 * Middleware factory. Call checkLimit(req, res, feature) at the start of a
 * route handler. feature is 'fetch' | 'score' | 'tailor'.
 * Increments the counter in DB and calls next() if within limit,
 * otherwise returns 403 with { upgrade: true }.
 */
async function checkLimit(req, res, feature) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

    const { plan, fetch_count, score_count, tailor_count, limits } = await getPlan(req);

    const countMap = { fetch: fetch_count, score: score_count, tailor: tailor_count };
    const limitMap = { fetch: limits.fetch_limit, score: limits.score_limit, tailor: limits.tailor_limit };
    const colMap   = { fetch: 'fetch_count',       score: 'score_count',      tailor: 'tailor_count' };

    const count = countMap[feature] ?? 0;
    const limit = limitMap[feature] ?? 0;

    if (count >= limit) {
      return res.status(403).json({
        success: false,
        error: `Limit reached for ${feature}`,
        upgrade: true,
        plan,
        feature,
      });
    }

    // Increment counter
    await pool.query(
      `UPDATE users SET ${colMap[feature]} = ${colMap[feature]} + 1 WHERE clerk_id = $1`,
      [clerkId]
    );

    return null; // caller should proceed with next()
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
    return err; // non-null signals caller to stop
  }
}

module.exports = { getPlan, checkLimit, PLAN_LIMITS };
