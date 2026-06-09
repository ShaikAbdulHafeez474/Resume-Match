const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const { requireAuth, getAuth } = require('@clerk/express');
const { pool, hashText, getActiveResume, deactivateResumes } = require('../db');
const { extractTextFromPDF } = require('../services/pdfExtract');
const { analyzeResume, coachWithContext } = require('../services/gemini');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildResumeContext, buildCoachPrompt } = require('../services/resumeContext');
const { checkLimit, getPlan } = require('../middleware/planCheck');

const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

async function getDbUserId(req) {
  const { userId: clerkId } = getAuth(req);
  const result = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
  if (!result.rows.length) throw new Error('User not found. Please sync first.');
  return result.rows[0].id;
}

// ── Extract skills from JD text using Gemini ─────────────────────────────
// Returns array of actual skill names (not generic keywords)
async function extractSkillsFromJD(jdText) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Extract only technical SKILLS from this job description. 
Skills are: programming languages, frameworks, libraries, tools, platforms, databases, methodologies.
NOT skills: soft skills, generic phrases like "communication", "teamwork", "problem solving", years of experience, educational requirements, or vague terms.

Examples of SKILLS: Python, React, Node.js, PostgreSQL, AWS, Docker, LangChain, REST APIs, Git, TensorFlow, MongoDB
Examples of NOT skills: "strong communication", "5 years experience", "bachelor's degree", "team player", "fast learner"

Job Description:
${jdText.slice(0, 3000)}

Return ONLY a JSON array of skill strings. No explanation, no markdown:
["skill1", "skill2", "skill3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    const skills = JSON.parse(text);
    return Array.isArray(skills) ? skills.map(s => s.toLowerCase().trim()).filter(s => s.length > 1 && s.length < 50) : [];
  } catch (err) {
    console.error('Skill extraction error:', err.message);
    console.log("error in fetching top skills : ",err);
    return [];
  }
}

// ── Upsert skills into frequency table ───────────────────────────────────
async function upsertSkillFrequency(userId, skills) {
  if (!skills || skills.length === 0) return;
  for (const skill of skills) {
    try {
      await pool.query(
        `INSERT INTO skills_frequency (user_id, skill_name, frequency, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (user_id, skill_name)
         DO UPDATE SET frequency = skills_frequency.frequency + 1, updated_at = NOW()`,
        [userId, skill]
      );
    } catch (e) {
      // silent — don't break save-tailoring if skill upsert fails
    }
  }
}

// ── Backfill skills from existing tailoring records ───────────────────────
// Called once per user when they open dashboard — idempotent
async function backfillSkillsForUser(userId) {
  try {
    // Check if backfill already done (skills_frequency has entries for this user)
    const existing = await pool.query(
      'SELECT COUNT(*) as count FROM skills_frequency WHERE user_id = $1',
      [userId]
    );
    if (parseInt(existing.rows[0].count) > 0) return; // already done

    // Get all JD texts from tailoring sessions
    const tailorings = await pool.query(
      'SELECT jd_text FROM job_tailoring WHERE user_id = $1 AND jd_text IS NOT NULL',
      [userId]
    );

    if (tailorings.rows.length === 0) return;

    console.log(`🔄 Backfilling skills for user ${userId} from ${tailorings.rows.length} tailoring sessions`);

    for (const row of tailorings.rows) {
      if (!row.jd_text || row.jd_text.trim().length < 50) continue;
      const skills = await extractSkillsFromJD(row.jd_text);
      await upsertSkillFrequency(userId, skills);
    }

    console.log(`✅ Backfill complete for user ${userId}`);
  } catch (err) {
    console.error('Backfill error:', err.message);
  }
}

// ─── POST /api/resume/upload ───────────────────────────────────────────────
router.post('/upload', requireAuth(), upload.single('resume'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    const userId = await getDbUserId(req);
    console.log('📄 Extracting PDF text...');
    const rawText = await extractTextFromPDF(filePath);
    if (!rawText || rawText.length < 100) {
      return res.status(400).json({ success: false, error: 'Could not extract text from PDF. Make sure it is not a scanned image.' });
    }
    const contentHash = hashText(rawText);
    const existing = await pool.query('SELECT * FROM resumes WHERE user_id = $1 AND content_hash = $2', [userId, contentHash]);
    if (existing.rows.length > 0) {
      await deactivateResumes(userId);
      await pool.query('UPDATE resumes SET is_active = true WHERE id = $1', [existing.rows[0].id]);
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.json({ success: true, resumeId: existing.rows[0].id, analysis: existing.rows[0].analysis, isExisting: true, message: 'Same resume detected. Profile restored.' });
    }
    console.log('🧠 Analyzing resume with Gemini...');
    const analysis = await analyzeResume(rawText);
    await deactivateResumes(userId);
    const resumeResult = await pool.query(
      `INSERT INTO resumes (user_id, filename, content_hash, raw_text, analysis, search_queries, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [userId, req.file.originalname, contentHash, rawText, JSON.stringify(analysis), analysis.search_queries]
    );
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, resumeId: resumeResult.rows[0].id, analysis, isExisting: false, message: 'Resume analyzed successfully.' });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Resume upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/me ────────────────────────────────────────────────────
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const resume = await getActiveResume(userId);

    // Trigger backfill in background (non-blocking)
    backfillSkillsForUser(userId).catch(() => {});

    res.json({ success: true, resume: resume || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/history ───────────────────────────────────────────────
router.get('/history', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      `SELECT id, filename, analysis->>'name' as name, analysis->>'current_title' as title, is_active, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, resumes: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/resume/analyze-job ─────────────────────────────────────────
router.post('/analyze-job/:jobId', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const { jdText } = req.body;

    if (!jdText || jdText.trim().length < 50) {
      return res.status(400).json({ success: false, error: 'Please provide a complete job description.' });
    }

    const resume = await getActiveResume(userId);
    if (!resume) return res.status(400).json({ success: false, error: 'No resume found. Upload your resume first.' });

    const resumeContext = buildResumeContext(resume);

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [req.params.jobId, userId]);
    const job = jobResult.rows[0] || { title: 'Job', company: 'Company' };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const resumeSections = Object.keys(resumeContext.analysis || {})
      .filter(k => !['name', 'email', 'phone', 'current_title', 'search_queries', 'years_experience', 'location'].includes(k))
      .filter(k => resumeContext.analysis[k] && (typeof resumeContext.analysis[k] !== 'string' || resumeContext.analysis[k].trim()))

    const sectionExamples = resumeSections.map(sec => `    "${sec}": {
      "improved": "full rewritten section with only keyword-enhanced points (preserve all other points unchanged)",
      "keywords_added": ["kw1", "kw2"],
      "reason": "brief explanation of what changed and why",
      "ats_impact": "High|Medium|Low"
    }`).join(',\n')

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant.

RESUME DATA (structured analysis):
${JSON.stringify(resumeContext.analysis, null, 2)}

FULL UPLOADED RESUME TEXT (COMPLETE — EVERY LINE):
${resumeContext.rawTextFull || 'Not available'}

JOB DESCRIPTION:
${jdText}

JOB TITLE: ${job.title}
COMPANY: ${job.company}

INSTRUCTIONS:
1. Compute a current ATS score (0-100) based on keyword overlap, skills alignment, and experience relevance.
2. Compute a potential ATS score after your improvements.
3. Identify missing keywords from the JD that are absent from the resume.
4. Identify weak areas and strong matches.
5. For EACH section that exists in the resume above (${resumeSections.join(', ')}):
   - Go through every bullet point / sentence one by one.
   - ONLY rewrite a point if adding a keyword from the JD would improve ATS scoring for that point.
   - Keep the meaning and story identical — never invent experience the candidate doesn't have.
   - Do not add new bullet points. Do not remove existing ones.
   - Return the FULL section content with only the keyword-enhanced points changed.

Return ONLY valid JSON (no markdown, no backticks, no explanation outside JSON):
{
  "ats_score_before": <number>,
  "ats_score_after": <number>,
  "missing_keywords": ["keyword1", "keyword2"],
  "weak_areas": ["area1", "area2"],
  "strong_matches": ["match1", "match2"],
  "improvements": {
${sectionExamples}
  }
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();

    let data;
    try {
      data = JSON.parse(clean);
    } catch {
      return res.status(500).json({ success: false, error: 'AI response parsing failed. Please try again.' });
    }

    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Analyze job error:', err);
    if (err.message?.includes('503')) return res.status(503).json({ success: false, error: 'AI service is temporarily busy. Please try again in a moment.' });
    if (err.message?.includes('429')) return res.status(429).json({ success: false, error: 'AI quota exceeded. Please try again later.' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/resume/save-tailoring/:jobId ───────────────────────────────
router.post('/save-tailoring/:jobId', requireAuth(), async (req, res) => {
  const limited = await checkLimit(req, res, 'tailor');
  if (limited) return;
  try {
    const userId = await getDbUserId(req);
    const { jd_text, ats_score_before, ats_score_after, sections, missing_keywords } = req.body;

    const result = await pool.query(
      `INSERT INTO job_tailoring (user_id, job_id, jd_text, ats_score_before, ats_score_after, sections, missing_keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, job_id) DO UPDATE
       SET jd_text = $3, ats_score_before = $4, ats_score_after = $5,
           sections = $6, missing_keywords = $7, updated_at = NOW()
       RETURNING *`,
      [userId, req.params.jobId, jd_text, ats_score_before, ats_score_after,
       JSON.stringify(sections), missing_keywords ? JSON.stringify(missing_keywords) : null]
    );

    // Extract skills from JD and update frequency map (non-blocking)
    if (jd_text && jd_text.trim().length > 50) {
      extractSkillsFromJD(jd_text)
        .then(skills => upsertSkillFrequency(userId, skills))
        .catch(err => console.error('Skill frequency update error:', err.message));
    }

    res.json({ success: true, tailoring: result.rows[0] });
  } catch (err) {
    console.error('Save tailoring error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/tailoring/:jobId ────────────────────────────────────
router.get('/tailoring/:jobId', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const result = await pool.query(
      'SELECT * FROM job_tailoring WHERE job_id = $1 AND user_id = $2',
      [req.params.jobId, userId]
    );
    res.json({ success: true, tailoring: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/resume/status ───────────────────────────────────────────────
router.get('/status', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const resume = await getActiveResume(userId);
    const history = await pool.query(
      `SELECT id, filename, analysis->>'name' as name, analysis->>'current_title' as title, is_active, created_at
       FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    res.json({ success: true, resume: resume || null, history: history.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/resume/refresh-analysis ────────────────────────────────────
router.post('/refresh-analysis', requireAuth(), async (req, res) => {
  try {
    const userId = await getDbUserId(req);
    const resume = await getActiveResume(userId);
    if (!resume?.raw_text || resume.raw_text.length < 100) {
      return res.status(400).json({ success: false, error: 'No resume text found. Please upload your resume again.' });
    }
    const analysis = await analyzeResume(resume.raw_text);
    await pool.query(
      `UPDATE resumes SET analysis = $1, search_queries = $2 WHERE id = $3`,
      [JSON.stringify(analysis), analysis.search_queries, resume.id]
    );
    res.json({ success: true, analysis, message: 'Resume analysis refreshed.' });
  } catch (err) {
    console.error('Refresh analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/resume/coach ───────────────────────────────────────────────
router.post('/coach', requireAuth(), async (req, res) => {
  try {
    // Elite-only feature
    const { plan } = await getPlan(req);
    if (plan !== 'elite') {
      return res.status(403).json({ success: false, error: 'AI Coach is an Elite feature. Upgrade to unlock.', upgrade: true, feature: 'coach' });
    }

    const userId = await getDbUserId(req);
    const { message, history = [], jobId = null, context = 'resume' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    const resume = await getActiveResume(userId);
    if (!resume) {
      return res.status(400).json({ success: false, error: 'Upload your resume first to use the AI coach.' });
    }

    const resumeContext = buildResumeContext(resume);
    if (!resumeContext.hasContent) {
      return res.status(400).json({ success: false, error: 'Your uploaded resume text could not be read. Please re-upload your PDF resume.' });
    }

    console.log(`Coach: using complete resume (${resumeContext.charCount} chars) for user ${userId}`);

    let job = null;
    let tailoring = null;

    if (jobId) {
      const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [jobId, userId]);
      job = jobResult.rows[0] || null;
      const tailoringResult = await pool.query('SELECT * FROM job_tailoring WHERE job_id = $1 AND user_id = $2', [jobId, userId]);
      tailoring = tailoringResult.rows[0] || null;
    }

    const prompt = buildCoachPrompt({ resumeContext, job, tailoring, context: jobId ? 'job' : context, history, message: message.trim() });
    const response = await coachWithContext({ prompt });

    res.json({ success: true, response });
  } catch (err) {
    console.error('Resume coach error:', err);
    if (err.message?.includes('429')) {
      return res.status(429).json({ success: false, error: 'AI quota exceeded. Please try again later.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;










