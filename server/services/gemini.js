const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// For resume analysis — smarter, handles complex understanding
const analysisModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// For job scoring — faster, cheaper, runs in batches
const scoringModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (err) {
      const isRateLimit = err.message?.includes('429') ||
                          err.message?.includes('quota') ||
                          err.message?.includes('Too Many Requests');
      if (isRateLimit && i < retries - 1) {
        const delay = 60000;
        console.log(`Rate limit hit. Waiting 60s before retry ${i + 1}...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
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
  "summary": "<2-3 sentence professional summary of the candidate>"
}

For search_queries: generate 5 specific, varied search terms that would find the best matching jobs on LinkedIn/Indeed.
Make them specific — not generic like "software engineer" but targeted like "AI Engineer LLM India" or "Node.js React Full Stack fresher".
  `;

  try {
    const result = await generateWithRetry(analysisModel, prompt);
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
      const result = await generateWithRetry(scoringModel, prompt);
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

module.exports = { analyzeResume, scoreJobsAgainstResume };
