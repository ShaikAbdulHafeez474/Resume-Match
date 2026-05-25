import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getFitLabel(score) {
  if (score >= 80) return 'STRONG FIT'
  if (score >= 65) return 'GOOD FIT'
  if (score >= 45) return 'DECENT FIT'
  return 'WEAK FIT'
}

export function getFitColor(score) {
  if (score >= 80) return 'var(--fit-strong)'
  if (score >= 65) return 'var(--fit-good)'
  if (score >= 45) return 'var(--fit-decent)'
  return 'var(--fit-weak)'
}

export function getSourceColor(source) {
  const colors = {
    linkedin:      { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4' },
    indeed:        { bg: 'rgba(139,92,246,0.12)',   color: '#8b5cf6' },
    google:        { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b' },
    naukri:        { bg: 'rgba(16,185,129,0.12)',   color: '#10b981' },
    zip_recruiter: { bg: 'rgba(59,130,246,0.12)',   color: '#3b82f6' },
    glassdoor:     { bg: 'rgba(99,102,241,0.12)',   color: '#6366f1' },
    wellfound:     { bg: 'rgba(236,72,153,0.12)',   color: '#ec4899' },
  }
  return colors[source?.toLowerCase()] || { bg: 'rgba(74,96,128,0.12)', color: '#4a6080' }
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
