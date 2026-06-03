const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model tier definitions — ordered from fastest/cheapest to most capable
const scoringModel  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
const analysisModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const proModel      = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

// Fallback chains used throughout this module
const ANALYSIS_MODELS = [analysisModel, proModel];        // flash  → pro
const SCORING_MODELS  = [scoringModel, analysisModel, proModel]; // lite → flash → pro

const MODEL_NAMES = new Map([
  [scoringModel,  'gemini-2.5-flash-lite'],
  [analysisModel, 'gemini-2.5-flash'],
  [proModel,      'gemini-2.5-pro'],
]);

function isOverloadedError(err) {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('model is busy') ||
    msg.includes('service unavailable') ||
    msg.includes('unavailable') ||
    err?.status === 503
  );
}

function isRateLimitError(err) {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('too many requests') ||
    msg.includes('resource_exhausted')
  );
}

/**
 * Try each model in the chain in order.
 * - On overload/busy → immediately skip to next model in chain.
 * - On rate limit    → wait 60 s and retry the same model (up to `retries` times).
 * - On other errors  → throw immediately.
 */
async function generateWithRetry(models, prompt, retries = 3) {
  const chain = Array.isArray(models) ? models : [models];

  for (let mi = 0; mi < chain.length; mi++) {
    const model    = chain[mi];
    const name     = MODEL_NAMES.get(model) || `model[${mi}]`;
    const isLast   = mi === chain.length - 1;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        if (mi > 0) console.log(`[gemini] Used fallback model: ${name}`);
        return result;
      } catch (err) {
        if (isOverloadedError(err)) {
          console.warn(`[gemini] ${name} is overloaded/busy.${isLast ? ' No more fallbacks.' : ` Trying next model...`}`);
          break; // move to next model in chain
        } else if (isRateLimitError(err) && attempt < retries - 1) {
          console.log(`[gemini] ${name} rate-limited. Waiting 60 s before retry ${attempt + 1}/${retries - 1}...`);
          await new Promise(r => setTimeout(r, 60000));
        } else {
          throw err;
        }
      }
    }
  }

  throw new Error('All Gemini models are unavailable. Please try again later.');
}

async function analyzeResume(resumeText) {
  const prompt = `
You are an expert resume analyzer and career advisor.

Analyze this resume carefully and extract structured information.

RESUME TEXT:
${resumeText}

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.

{
  "name": "<candidate full name>",
  "current_title": "<most recent job title or student>",
  "experience_level": "<fresher|junior|mid|senior>",
  "years_of_experience": <number or 0 for freshers>,
  "education": {
    "degree": "<degree name>",
    "field": "<field of study>",
    "institution": "<university/college name>",
    "graduation_year": "<year>"
  },
  "core_skills": ["<skill1>", "<skill2>"],
  "frameworks_tools": ["<tool1>", "<tool2>"],
  "domains": ["<domain1>"],
  "target_roles": ["<role1>", "<role2>"],
  "search_queries": [
    "<specific job search query 1>",
    "<specific job search query 2>",
    "<specific job search query 3>",
    "<specific job search query 4>",
    "<specific job search query 5>"
  ],
  "preferred_locations": ["<location1>", "<location2>"],
  "open_to_remote": <true|false>,
  "summary": "<2-3 sentence professional summary of the candidate>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company name>",
      "duration": "<dates or duration>",
      "bullets": ["<achievement bullet 1>", "<achievement bullet 2>"]
    }
  ],
  "projects": [
    {
      "name": "<project name>",
      "technologies": ["<tech1>", "<tech2>"],
      "bullets": ["<project bullet 1>", "<project bullet 2>"],
      "description": "<optional one-line description>"
    }
  ]
}

Extract ALL experience entries and ALL projects with their exact bullet points from the resume.
Do not skip or summarize bullets — preserve the actual content.

For search_queries: generate 5 specific, varied search terms that would find the best matching jobs on LinkedIn/Indeed.
Make them specific — not generic like "software engineer" but targeted like "AI Engineer LLM India" or "Node.js React Full Stack fresher".
  `;

  try {
    const result = await generateWithRetry(ANALYSIS_MODELS, prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini returned no JSON object');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Resume analysis failed:', err.message);
    throw new Error('Failed to analyze resume');
  }
}

async function scoreJobsAgainstResume(jobs, resumeAnalysis) {
  const candidateSummary = `
Name: ${resumeAnalysis.name}
Current Title: ${resumeAnalysis.current_title}
Experience Level: ${resumeAnalysis.experience_level} (${resumeAnalysis.years_of_experience} years)
Education: ${resumeAnalysis.education.degree} in ${resumeAnalysis.education.field} from ${resumeAnalysis.education.institution}
Core Skills: ${resumeAnalysis.core_skills.join(', ')}
Tools/Frameworks: ${resumeAnalysis.frameworks_tools.join(', ')}
Domains: ${resumeAnalysis.domains.join(', ')}
Target Roles: ${resumeAnalysis.target_roles.join(', ')}
Summary: ${resumeAnalysis.summary}
  `.trim();

  // Free tier cap — only score first 30 jobs
  if (jobs.length > 30) {
    console.log(`Free tier cap: scoring first 30 jobs only (${jobs.length} total scraped)`);
  }
  const jobsToScore = jobs.slice(0, 30);

  const BATCH_SIZE = 3;
  const results = [];

  for (let i = 0; i < jobsToScore.length; i += BATCH_SIZE) {
    const batch = jobsToScore.slice(i, i + BATCH_SIZE);

    const jobsText = batch.map((job, idx) => `
JOB ${idx + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Remote: ${job.is_remote}
Description: ${(job.description || '').slice(0, 1500)}
    `).join('\n---\n');

    const prompt = `
You are a job fit analyzer. Score how well this candidate matches each job.

CANDIDATE:
${candidateSummary}

JOBS TO SCORE:
${jobsText}

Respond ONLY with a JSON array of ${batch.length} objects, one per job in order:
[
  {
    "fit_score": <0-100 integer>,
    "fit_reason": "<2 sentence explanation of why this is or isn't a good fit>",
    "fit_highlights": "<3 specific matching points, comma separated>",
    "match_skills": ["<matched skill 1>", "<matched skill 2>", "<matched skill 3>"]
  }
]

Scoring guide:
- 85-100: Near-perfect match, candidate clearly qualified
- 65-84: Good match, most requirements met
- 45-64: Partial match, some relevant skills
- 0-44: Poor match, significant gaps
    `;

    try {
      const result = await generateWithRetry(SCORING_MODELS, prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Gemini returned no JSON array');
      const scores = JSON.parse(jsonMatch[0]);
      // Ensure one score per job — fill gaps with fallback
      const safeScores = batch.map((_, j) => scores[j] || {
        fit_score: 50,
        fit_reason: 'Could not score automatically.',
        fit_highlights: '',
        match_skills: []
      });
      results.push(...safeScores);
    } catch (err) {
      console.error(`Batch scoring failed:`, err.message);
      batch.forEach(() => results.push({
        fit_score: 50,
        fit_reason: 'Could not score automatically.',
        fit_highlights: '',
        match_skills: []
      }));
    }

    if (i + BATCH_SIZE < jobsToScore.length) {
      await new Promise(r => setTimeout(r, 7000));
    }
  }

  // For any jobs beyond the 30-job cap, append unscored fallbacks
  for (let i = jobsToScore.length; i < jobs.length; i++) {
    results.push({
      fit_score: 50,
      fit_reason: 'Job not scored — free tier limit reached.',
      fit_highlights: '',
      match_skills: []
    });
  }

  return results;
}

async function coachWithContext({ prompt }) {
  const result = await generateWithRetry(ANALYSIS_MODELS, prompt);
  return result.response.text().trim();
}

module.exports = { analyzeResume, scoreJobsAgainstResume, coachWithContext };
