/**
 * Resume Health = % of standard resume sections with real content in analysis JSON.
 * Based on upload/analysis only — AI chat does not change this score.
 */
export function computeResumeHealth(analysis) {
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

export const HEALTH_SECTIONS = [
  { key: 'summary',     label: 'Summary'    },
  { key: 'core_skills', label: 'Skills'     },
  { key: 'experience',  label: 'Experience' },
  { key: 'projects',    label: 'Projects'   },
  { key: 'education',   label: 'Education'  },
]

export function isSectionFilled(analysis, key) {
  if (!analysis) return false
  const checks = {
    summary: () => typeof analysis.summary === 'string' && analysis.summary.trim().length > 0,
    core_skills: () => Array.isArray(analysis.core_skills) && analysis.core_skills.filter(Boolean).length > 0,
    experience: () => {
      if (Array.isArray(analysis.experience) && analysis.experience.length > 0) return true
      if (typeof analysis.experience === 'string' && analysis.experience.trim()) return true
      return false
    },
    projects: () => {
      if (Array.isArray(analysis.projects) && analysis.projects.length > 0) return true
      if (typeof analysis.projects === 'string' && analysis.projects.trim()) return true
      return false
    },
    education: () => {
      const ed = analysis.education
      if (!ed || typeof ed !== 'object') return false
      return Boolean(ed.degree?.toString().trim() || ed.institution?.toString().trim() || ed.field?.toString().trim())
    },
  }
  return checks[key]?.() ?? false
}

export function healthColor(pct) {
  if (pct >= 70) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

export function healthLabel(pct) {
  if (pct >= 70) return 'Good'
  if (pct >= 50) return 'Fair'
  return 'Needs Work'
}
