const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const Razorpay = require('razorpay');
const { requireAuth, getAuth } = require('@clerk/express');
const { pool } = require('../db');
const { getPlan, PLAN_LIMITS } = require('../middleware/planCheck');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLAN_AMOUNTS = { pro: 900, elite: 1900 }; // paise

async function getDbClerkId(req) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) throw new Error('Unauthenticated');
  return clerkId;
}

// ── POST /api/payment/create-order ─────────────────────────────────────────
router.post('/create-order', requireAuth(), async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['pro', 'elite'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    const amount   = PLAN_AMOUNTS[plan];
    const receipt  = `rcpt_${plan}_${Date.now()}`;
    const order    = await razorpay.orders.create({ amount, currency: 'INR', receipt });
    res.json({ success: true, orderId: order.id, amount, currency: 'INR', key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('[payment] create-order error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/payment/verify ────────────────────────────────────────────────
router.post('/verify', requireAuth(), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const clerkId = await getDbClerkId(req);

    // Verify signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    await pool.query(
      `UPDATE users
       SET plan=$1, plan_started_at=NOW(), plan_expires_at=NOW() + INTERVAL '30 days',
           razorpay_payment_id=$2, razorpay_order_id=$3
       WHERE clerk_id=$4`,
      [plan, razorpay_payment_id, razorpay_order_id, clerkId]
    );

    res.json({ success: true, plan });
  } catch (err) {
    console.error('[payment] verify error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/payment/webhook ───────────────────────────────────────────────
// No Clerk auth — Razorpay sends this directly
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body      = req.body; // Buffer when express.raw is used

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body.toString());
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const notes   = payment.notes || {};
      const plan    = notes.plan;
      const clerkId = notes.clerk_id;

      if (plan && clerkId) {
        await pool.query(
          `UPDATE users
           SET plan=$1, plan_started_at=NOW(), plan_expires_at=NOW() + INTERVAL '30 days',
               razorpay_payment_id=$2, razorpay_order_id=$3
           WHERE clerk_id=$4`,
          [plan, payment.id, payment.order_id, clerkId]
        );
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[payment] webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payment/status ─────────────────────────────────────────────────
router.get('/status', requireAuth(), async (req, res) => {
  try {
    const clerkId = await getDbClerkId(req);
    const result  = await pool.query(
      `SELECT plan, plan_started_at, plan_expires_at, fetch_count, score_count, tailor_count, usage_reset_at
       FROM users WHERE clerk_id=$1`,
      [clerkId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    const user   = result.rows[0];
    const plan   = user.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    res.json({
      success: true,
      plan,
      plan_started_at: user.plan_started_at,
      plan_expires_at: user.plan_expires_at,
      usage: {
        fetch:  { used: user.fetch_count  || 0, limit: limits.fetch_limit  },
        score:  { used: user.score_count  || 0, limit: limits.score_limit  },
        tailor: { used: user.tailor_count || 0, limit: limits.tailor_limit },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
