/**
 * Resume Health = % of standard resume sections that have real content
 * in the stored analysis JSON (from PDF upload). NOT affected by AI chat.
 */
function computeResumeHealth(analysis) {
  if (!analysis || typeof analysis !== 'object') return null

  const sectionChecks = {
    summary: () =>
      typeof analysis.summary === 'string' && analysis.summary.trim().length > 0,

    core_skills: () =>
      Array.isArray(analysis.core_skills) && analysis.core_skills.filter(Boolean).length > 0,

    experience: () => {
      if (Array.isArray(analysis.experience) && analysis.experience.length > 0) return true
      if (typeof analysis.experience === 'string' && analysis.experience.trim().length > 0) return true
      return false
    },

    projects: () => {
      if (Array.isArray(analysis.projects) && analysis.projects.length > 0) return true
      if (typeof analysis.projects === 'string' && analysis.projects.trim().length > 0) return true
      return false
    },

    education: () => {
      const ed = analysis.education
      if (!ed || typeof ed !== 'object') return false
      return Boolean(
        (ed.degree && String(ed.degree).trim()) ||
        (ed.institution && String(ed.institution).trim()) ||
        (ed.field && String(ed.field).trim())
      )
    },
  }

  const keys = Object.keys(sectionChecks)
  const filled = keys.filter(k => sectionChecks[k]()).length
  return Math.round((filled / keys.length) * 100)
}

module.exports = { computeResumeHealth }
