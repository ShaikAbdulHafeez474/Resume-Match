const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool, hashText, getActiveResume, deactivateResumes } = require('../db');
const { extractTextFromPDF }  = require('../services/pdfExtract');
const { analyzeResume }       = require('../services/gemini');

const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// Helper — get DB userId from Clerk
async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// ─── POST /api/resume/upload ───────────────────────────────────────────────
// Uploads and analyzes resume. Deactivates old resume, saves new one.
// Does NOT fetch jobs — that's the /api/jobs/fetch endpoint.
router.post('/upload', requireAuth(), upload.single('resume'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const userId = await getDbUserId(req);

    // Extract PDF
    console.log('📄 Extracting PDF text...');
    const rawText = await extractTextFromPDF(filePath);
    if (!rawText || rawText.length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF. Make sure it is not a scanned image.'
      });
    }

    // Check if same resume already exists for this user
    const contentHash = hashText(rawText);
    const existing = await pool.query(
      'SELECT * FROM resumes WHERE user_id = $1 AND content_hash = $2',
      [userId, contentHash]
    );

    if (existing.rows.length > 0) {
      // Same resume — just make it active, no need to re-analyze
      await deactivateResumes(userId);
      await pool.query(
        'UPDATE resumes SET is_active = true WHERE id = $1',
        [existing.rows[0].id]
      );
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.json({
        success: true,
        resumeId: existing.rows[0].id,
        analysis: existing.rows[0].analysis,
        isExisting: true,
        message: 'Same resume detected. Profile restored.',
      });
    }

    // New resume — analyze with Gemini
    console.log('🧠 Analyzing resume with Gemini...');
    const analysis = await analyzeResume(rawText);

    // Deactivate old resumes
    await deactivateResumes(userId);

    // Save new resume
    const resumeResult = await pool.query(
      `INSERT INTO resumes (user_id, filename, content_hash, raw_text, analysis, search_queries, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [userId, req.file.originalname, contentHash, rawText, JSON.stringify(analysis), analysis.search_queries]
    );
    const resumeId = resumeResult.rows[0].id;

    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      success: true,
      resumeId,
      analysis,
      isExisting: false,
      message: 'Resume analyzed successfully. Ready to fetch jobs.',
    });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Resume upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/me ────────────────────────────────────────────────────
// Get current user's active resume
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const resume = await getActiveResume(userId);
    res.json({ success: true, resume: resume || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/history ───────────────────────────────────────────────
// Get all resume versions for this user
router.get('/history', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `SELECT id, filename, analysis->>'name' as name,
              analysis->>'current_title' as title,
              is_active, created_at
       FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, resumes: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;