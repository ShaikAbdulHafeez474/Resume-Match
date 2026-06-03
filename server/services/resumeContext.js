function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

function parseAnalysis(analysis) {
  return parseJsonField(analysis) || {};
}

function buildResumeContext(resume) {
  const analysis = parseAnalysis(resume?.analysis);
  const rawTextFull = (resume?.raw_text || '').trim();

  return {
    analysis,
    rawTextFull,
    filename: resume?.filename || null,
    charCount: rawTextFull.length,
    hasContent: rawTextFull.length > 50,
  };
}

function buildResumeDocument(resumeContext) {
  const { rawTextFull, filename, charCount, analysis } = resumeContext;

  const meta = [
    filename ? `Source file: ${filename}` : null,
    analysis.name ? `Candidate: ${analysis.name}` : null,
    `Document size: ${charCount} characters (complete verbatim text below)`,
  ].filter(Boolean).join('\n');

  return `${meta}

========== COMPLETE UPLOADED RESUME — VERBATIM, DO NOT SKIP ANY LINE ==========
${rawTextFull}
========== END OF COMPLETE RESUME ==========`;
}

function buildJobContext(job) {
  if (!job) return '';

  const formatList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (typeof value === 'string') return value.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
    return '';
  };

  return [
    `Title: ${job.title || 'Unknown'}`,
    `Company: ${job.company || 'Unknown'}`,
    job.location ? `Location: ${job.location}` : null,
    job.is_remote ? 'Remote: Yes' : null,
    job.fit_score ? `Fit Score: ${job.fit_score}/100` : null,
    job.fit_reason ? `Fit Reason: ${job.fit_reason}` : null,
    formatList(job.match_skills) ? `Matched Skills: ${formatList(job.match_skills)}` : null,
    job.fit_highlights ? `Fit Highlights: ${job.fit_highlights}` : null,
    job.description ? `Job Description:\n${String(job.description)}` : null,
  ].filter(Boolean).join('\n');
}

function buildTailoringContext(tailoring) {
  if (!tailoring) return '';

  const sections = parseJsonField(tailoring.sections) || {};
  const sectionNames = Object.keys(sections).filter(k => sections[k]?.improved);
  const missingKeywords = parseJsonField(tailoring.missing_keywords) || [];

  return [
    tailoring.ats_score_before != null ? `ATS Before: ${tailoring.ats_score_before}` : null,
    tailoring.ats_score_after != null ? `ATS After: ${tailoring.ats_score_after}` : null,
    missingKeywords.length ? `Missing Keywords: ${missingKeywords.join(', ')}` : null,
    sectionNames.length ? `Customized Sections: ${sectionNames.join(', ')}` : null,
    tailoring.jd_text ? `Saved Job Description:\n${String(tailoring.jd_text)}` : null,
  ].filter(Boolean).join('\n');
}

function formatConversationHistory(history = []) {
  return history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text.trim()}`)
    .join('\n\n');
}

function buildCoachPrompt({ resumeContext, job, tailoring, context = 'resume', history = [], message }) {
  const resumeDocument = buildResumeDocument(resumeContext);
  const jobBlock = buildJobContext(job);
  const tailoringBlock = buildTailoringContext(tailoring);
  const conversation = formatConversationHistory(history);

  return `You are the AI Resume Coach inside ResuMatch.

The candidate's COMPLETE resume is attached below — every word, bullet point, comma, and period.
This is identical to uploading a PDF in ChatGPT or Gemini. The user must NEVER paste resume content again.

ABSOLUTE RULES:
1. NEVER ask the user to share, paste, or provide their resume, projects, bullet points, or job descriptions.
2. NEVER say "I need more information" if the answer exists anywhere in the complete resume text below.
3. Read the ENTIRE resume text below before answering — every section including summary, experience, projects, education, skills, certifications, and links.
4. When discussing projects or experience, quote their ACTUAL bullet points verbatim and suggest specific rewrites.
5. Do not invent experience, companies, degrees, projects, or skills not present in the resume text.
6. If something is truly absent from the resume text, say it is not listed there.
7. Do NOT summarize how many projects you found — analyze the actual content.
8. Respond in clean markdown only. NEVER use markdown tables (no | pipe | syntax). NEVER use JSON.

RESPONSE FORMAT — professional markdown only:

Use ## for main sections and ### for subsections. Separate content with headings, NOT tables.

Line prefixes (always use these):
✅ for strengths and matches from the resume
⚠️ for gaps, missing items, or weak areas
💡 for tips and nudges (rendered as highlight boxes)
→ for quick action steps

Use **bold** for project names, companies, skills, and technologies.
Use > blockquotes to quote current resume text.
Use numbered lists (1. 2. 3.) for sequential steps or rewrites.
Use - for simple bullet lists.

NEVER use markdown tables. For before/after comparisons use headings:

### Project Name
**Current:**
> exact bullet from resume

**Suggested:**
> improved bullet text

💡 Why this helps: one sentence explanation

Example response structure:

Hi [Name]! Here is my analysis based on your uploaded resume.

## Your Projects

### Career Horizon
✅ **Strong stack** — You use **Python** and **LangChain**, which matches AI engineer roles.

⚠️ **Missing metrics** — The current bullet lacks measurable impact.

**Current:**
> Built a RAG chatbot using LangChain

**Suggested:**
> Engineered a RAG chatbot using **LangChain** and **Python**, reducing response latency by 40%

💡 Add numbers (users, latency, accuracy) to every project bullet for ATS impact.

## Recommended Actions
→ Add **Docker** or **AWS** if you used them in deployment
→ Keep each bullet under 2 lines for ATS parsing

RULES:
- Only include sections relevant to the user's question.
- Quote exact content from the resume — never ask user to paste it.
- Keep tone professional, clear, and concise.
- 2-4 ## sections max unless the question requires more detail.

${context === 'job' && jobBlock ? `TARGET JOB:\n${jobBlock}\n` : ''}
${tailoringBlock ? `SAVED ATS OPTIMIZATION:\n${tailoringBlock}\n` : ''}

${resumeDocument}

${conversation ? `========== PREVIOUS CONVERSATION ==========\n${conversation}\n========== END CONVERSATION ==========\n\n` : ''}
========== CURRENT USER MESSAGE ==========
${message.trim()}

Respond now using the COMPLETE resume text above. Use clean markdown with headings, icons (✅⚠️💡→), and bullets. No tables. Never ask the user to provide content you already have.`;
}

function normalizeChatHistory(history = []) {
  return history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-10)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text.trim() }],
    }))
    .filter((entry, index) => !(index === 0 && entry.role === 'model'));
}

module.exports = {
  buildResumeContext,
  buildResumeDocument,
  buildCoachPrompt,
  buildCoachSystemInstruction: buildCoachPrompt,
  normalizeChatHistory,
  parseJsonField,
};
