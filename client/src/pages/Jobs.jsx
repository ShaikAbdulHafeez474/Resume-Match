import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import {
  Search, X, ExternalLink, Bookmark, BookmarkCheck, Sparkles, SkipForward,
  CheckCircle2, Briefcase, MapPin, Clock, Send, ChevronRight,
  Building2, AlertCircle, Zap, Filter,
} from 'lucide-react'
import {
  getJobsByFilter, applyJob, saveJob, skipJobWithReason,
  analyzeJobResume, saveJobTailoring, getJobTailoring,
  chatWithCoach, getResumeStatus,
} from '../lib/api'
import ChatBubble, { ChatMarkdown, ChatTypingIndicator, ResumeAttachedChip } from '../components/ChatBubble'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

// Safely convert any value to a renderable string — prevents React "Objects are
// not valid as a React child" crashes when the AI returns nested objects/arrays
// inside section fields.
function safeStr(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) {
    return val.map(item =>
      typeof item === 'string' ? item
      : typeof item === 'object' && item !== null
        ? Object.values(item).filter(v => typeof v === 'string').join(' · ')
        : String(item)
    ).join('\n')
  }
  // Plain object — render key: value pairs
  return Object.entries(val)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
}

// Safely convert keywords_added to a string array
function safeKeywords(kws) {
  if (!kws) return []
  if (!Array.isArray(kws)) return []
  return kws.map(k => (typeof k === 'string' ? k : safeStr(k))).filter(Boolean)
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return null
  try {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return '1d ago'
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`
    return `${Math.floor(diff / 30)}mo ago`
  } catch { return null }
}

function parseSkills(s) {
  if (Array.isArray(s)) return s.filter(Boolean)
  if (typeof s === 'string') return s.replace(/[{}]/g, '').split(',').map(x => x.trim()).filter(Boolean)
  return []
}

function scoreTier(score) {
  const s = parseInt(score) || 0
  if (s >= 80) return { label: 'Strong Fit', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' }
  if (s >= 65) return { label: 'Good Fit',   color: '#059669', bg: '#f0fdf4', border: '#a7f3d0' }
  if (s >= 45) return { label: 'Decent Fit', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return           { label: 'Weak Fit',   color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' }
}

function companyInitials(name) {
  if (!name) return 'JB'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const LOGO_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#ede9fe', color: '#6d28d9' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#f0fdf4', color: '#166534' },
]

function logoColor(name) {
  const idx = (name || '').charCodeAt(0) % LOGO_COLORS.length
  return LOGO_COLORS[idx] || LOGO_COLORS[0]
}

// ── Skip Modal ────────────────────────────────────────────────────────────────
function SkipModal({ job, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const reasons = ['Not Relevant', 'Low ATS Score', 'Wrong Tech Stack', 'Wrong Location', 'Already Applied Elsewhere', 'Other']
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', width: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: '0 0 4px', fontFamily: FONT }}>Why are you skipping?</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontFamily: FONT }}>{job?.title} · {job?.company}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reasons.map(r => (
            <div key={r} onClick={() => setReason(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${reason === r ? '#6366f1' : '#cbd5e1'}`, background: reason === r ? '#6366f1' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {reason === r && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <span style={{ fontSize: 14, fontWeight: reason === r ? 700 : 500, color: reason === r ? '#6366f1' : '#334155', fontFamily: FONT }}>{r}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={() => reason && onConfirm(reason)} disabled={!reason} style={{
            padding: '11px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', fontFamily: FONT, cursor: reason ? 'pointer' : 'not-allowed',
            background: reason ? '#6366f1' : '#f1f5f9', color: reason ? '#fff' : '#94a3b8',
          }}>Skip Job</button>
        </div>
      </div>
    </div>
  )
}

// ── Mini Job Card (left list) ─────────────────────────────────────────────────
function MiniJobCard({ job, isSelected, onClick }) {
  const skills = parseSkills(job.match_skills).slice(0, 3)
  const score = parseInt(job.fit_score) || 0
  const tier = scoreTier(score)
  const lc = logoColor(job.company)

  return (
    <div onClick={onClick} style={{
      padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
      background: isSelected ? '#fafbff' : '#fff',
      borderLeft: `3px solid ${isSelected ? '#6366f1' : 'transparent'}`,
      transition: 'all 0.12s',
    }}
    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderLeft = '3px solid #e0e7ff' } }}
    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderLeft = '3px solid transparent' } }}>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Company logo */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: lc.bg, color: lc.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, fontFamily: FONT,
          border: `1px solid ${lc.bg}`,
        }}>
          {companyInitials(job.company)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {job.title}
            </div>
            {/* Score badge */}
            {score > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: tier.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}%</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: tier.color, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{tier.label}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Building2 size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.company}</span>
          </div>

          {(job.location || job.posted_at || job.fetched_at) && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9} strokeWidth={2} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {[job.location, timeAgo(job.posted_at || job.fetched_at)].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {skills.map((s, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: '#f1f5f9', color: '#475569',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{s}</span>
            ))}
            {parseSkills(job.match_skills).length > 3 && (
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: FONT }}>+{parseSkills(job.match_skills).length - 3}</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              {job.is_applied && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '2px 7px' }}>✓ Applied</span>
              )}
              {job.is_saved && (
                <Bookmark size={12} strokeWidth={2} color="#6366f1" fill="#6366f1" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Job Detail Center Panel ───────────────────────────────────────────────────
function JobDetailCenter({ job, onApply, onSave, onSkip, onTailor }) {
  const [tab, setTab] = useState('overview')
  const [expanded, setExpanded] = useState(false)

  if (!job) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#94a3b8', padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Briefcase size={28} strokeWidth={1.5} color="#94a3b8" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', fontFamily: FONT, marginBottom: 4 }}>Select a job</div>
          <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: FONT }}>Click any job from the list to view details.</div>
        </div>
      </div>
    )
  }

  const skills = parseSkills(job.match_skills)
  const lc = logoColor(job.company)
  const score = parseInt(job.fit_score) || 0
  const tier = scoreTier(score)
  const desc = job.description || ''
  const shortDesc = expanded ? desc : desc.slice(0, 400)

  // Parse description into structured sections (best-effort)
  const descLines = desc.split('\n').map(l => l.trim()).filter(Boolean)
  const TABS = [
    { id: 'overview',  label: 'Overview'        },
    { id: 'match',     label: 'Match Analysis'  },
    { id: 'company',   label: 'Company'         },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: lc.bg, color: lc.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, fontFamily: FONT,
          }}>
            {companyInitials(job.company)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.25, fontFamily: FONT }}>
              {job.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} strokeWidth={1.5} />{job.company}
              </span>
              {job.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} strokeWidth={1.5} />{job.location}
                </span>
              )}
              {(job.posted_at || job.fetched_at) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} strokeWidth={1.5} />{timeAgo(job.posted_at || job.fetched_at)}
                </span>
              )}
              {job.apply_url && (
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                  View on LinkedIn <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {job.apply_url && (
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
              background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
              fontFamily: FONT,
            }}>
              <ExternalLink size={13} /> Apply Now
            </a>
          )}
          <button onClick={onSave} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            background: '#fff', border: '1px solid #e2e8f0', color: job.is_saved ? '#6366f1' : '#334155',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
          }}>
            {job.is_saved ? <Bookmark size={13} fill="#6366f1" strokeWidth={0} /> : <Bookmark size={13} strokeWidth={2} />}
            {job.is_saved ? 'Saved' : 'Save Job'}
          </button>
          {!job.is_applied ? (
            <button onClick={onApply} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              background: '#fff', border: '1px solid #e2e8f0', color: '#334155',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
            }}>
              <CheckCircle2 size={13} strokeWidth={2} /> Mark Applied
            </button>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: 13 }}>
              <CheckCircle2 size={13} strokeWidth={2.5} /> Applied
            </span>
          )}
          {!job.is_skipped ? (
            <button onClick={onSkip} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
              background: '#fff', border: '1px solid #e2e8f0', color: '#94a3b8',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
            }}>
              <SkipForward size={13} strokeWidth={2} /> Skip
            </button>
          ) : (
            <span style={{ padding: '9px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
              Skipped
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0, padding: '0 24px' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '12px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontSize: 13, fontWeight: tab === id ? 700 : 500,
            color: tab === id ? '#6366f1' : '#64748b',
            borderBottom: `2px solid ${tab === id ? '#6366f1' : 'transparent'}`,
            fontFamily: FONT, marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', gap: 0, minHeight: '100%' }}>
            {/* Left: Description content */}
            <div style={{ flex: 1, padding: '20px 24px', minWidth: 0, borderRight: '1px solid #f1f5f9' }}>

              {desc && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', fontFamily: FONT }}>About the Role</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: '#475569', margin: 0, fontFamily: FONT, fontWeight: 450 }}>
                    {shortDesc}{!expanded && desc.length > 400 ? '...' : ''}
                  </p>
                  {desc.length > 400 && (
                    <button onClick={() => setExpanded(!expanded)} style={{
                      marginTop: 8, background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {expanded ? 'Show less ↑' : 'Show more ↓'}
                    </button>
                  )}
                </div>
              )}

              {skills.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', fontFamily: FONT }}>Key Responsibilities</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {skills.slice(0, 6).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 7 }} />
                        <span style={{ fontSize: 14, color: '#475569', fontFamily: FONT, lineHeight: 1.7 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech Stack */}
              {skills.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', fontFamily: FONT }}>Tech Stack</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skills.map((s, i) => (
                      <span key={i} style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                        background: '#f0f4ff', color: '#4f46e5',
                        border: '1px solid #e0e7ff',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits row */}
              {(job.is_remote || job.job_type || job.salary_display) && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', fontFamily: FONT }}>Benefits</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {job.is_remote && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 20, padding: '6px 14px', fontFamily: FONT, fontWeight: 600 }}>
                        🌐 Remote Friendly
                      </span>
                    )}
                    {job.job_type && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '6px 14px', fontFamily: FONT, fontWeight: 600 }}>
                        ⏰ {job.job_type}
                      </span>
                    )}
                    {job.salary_display && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '6px 14px', fontFamily: FONT, fontWeight: 600 }}>
                        💰 {job.salary_display}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Job Details sidebar */}
            <div style={{ width: 240, flexShrink: 0, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
                  Job Details
                </div>
                {[
                  { label: 'Employment Type', value: job.job_type || '—' },
                  { label: 'Work Mode',        value: job.is_remote ? 'Hybrid / Remote' : 'On-site' },
                  { label: 'Location',         value: job.location || '—' },
                  { label: 'Salary Range',     value: job.salary_display || '—' },
                  { label: 'Source',           value: job.source || '—' },
                  { label: 'Posted On',        value: job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                ].filter(({ value }) => value && value !== '—').map(({ label, value }) => (
                  <div key={label} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 3, fontFamily: FONT }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: FONT }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Quick Apply Links */}
              {job.apply_url && (
                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
                    Quick Apply
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10,
                      background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155',
                      fontWeight: 600, fontSize: 12, textDecoration: 'none', fontFamily: FONT,
                    }}>
                      <Building2 size={13} strokeWidth={2} color="#6366f1" />
                      Company Career Page
                      <ExternalLink size={11} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MATCH ANALYSIS */}
        {tab === 'match' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {score > 0 ? (
              <>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  {/* Circular score */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: 90, height: 90 }}>
                      <svg width="90" height="90">
                        <circle cx="45" cy="45" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="45" cy="45" r="38" fill="none" stroke={tier.color} strokeWidth="8"
                          strokeDasharray={`${(score / 100) * 239} 239`} strokeLinecap="round"
                          transform="rotate(-90 45 45)" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: tier.color }}>{score}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tier.color, marginTop: 6, fontFamily: FONT }}>{tier.label}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6, fontFamily: FONT }}>
                      {score >= 80 ? 'Great match!' : score >= 65 ? 'Good match!' : 'Partial match'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, fontFamily: FONT }}>
                      {score >= 80
                        ? 'Your resume aligns well with this job description.'
                        : score >= 65
                          ? 'Your profile covers most of the key requirements.'
                          : 'There are some gaps between your profile and this role.'}
                    </div>
                  </div>
                </div>

                {/* Match bars */}
                {[
                  { label: 'Skills Match',      pct: Math.min(99, Math.round(score * 1.05)), color: '#6366f1' },
                  { label: 'Keyword Match',     pct: Math.min(99, Math.round(score * 0.92)), color: '#0891b2' },
                  { label: 'Experience Match',  pct: Math.min(99, Math.round(score * 0.85)), color: '#059669' },
                  { label: 'Education Match',   pct: Math.min(99, Math.round(score * 0.78)), color: '#7c3aed' },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: FONT }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}

                {/* Strengths */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10, fontFamily: FONT }}>Strengths</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(job.fit_highlights || '').split(',').filter(Boolean).slice(0, 3).map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <CheckCircle2 size={15} strokeWidth={2.5} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: '#475569', fontFamily: FONT }}>{h.trim()}</span>
                      </div>
                    ))}
                    {!job.fit_highlights && (
                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', fontFamily: FONT }}>
                        Score this job or use Tailor Resume to get detailed insights.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontFamily: FONT }}>
                <AlertCircle size={36} strokeWidth={1.5} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>No match data yet</div>
                <div style={{ fontSize: 13 }}>Use "Tailor Resume" to run an ATS analysis for this job.</div>
              </div>
            )}
          </div>
        )}

        {/* COMPANY */}
        {tab === 'company' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '20px', background: '#fafbff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: logoColor(job.company).bg, color: logoColor(job.company).color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 18, fontFamily: FONT,
              }}>
                {companyInitials(job.company)}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: FONT }}>{job.company}</div>
                {job.location && <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontFamily: FONT }}>{job.location}</div>}
              </div>
            </div>
            {[
              { label: 'Industry',   value: '—' },
              { label: 'Source',     value: job.source || '—' },
              { label: 'Job Type',   value: job.job_type || '—' },
              { label: 'Work Mode',  value: job.is_remote ? 'Remote / Hybrid' : 'On-site' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: FONT }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tailor Resume CTA bar */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', background: '#fafbff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: '#64748b', fontFamily: FONT }}>
          {score > 0 ? `Improve your match by addressing missing skills and keywords.` : 'Analyze your resume against this job description.'}
        </div>
        <button onClick={onTailor} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10,
          background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: FONT,
          boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
        }}>
          <Sparkles size={14} strokeWidth={2} /> Tailor Resume
        </button>
      </div>
    </div>
  )
}

// ── Right Match Panel ──────────────────────────────────────────────────────────
function MatchPanel({ job, onTailor }) {
  const [tab, setTab] = useState('overview')
  const [tailoring, setTailoring] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [resumeFilename, setResumeFilename] = useState('resume.pdf')
  const chatEndRef = useRef()

  useEffect(() => {
    getResumeStatus().then(r => {
      if (r.data.resume?.filename) setResumeFilename(r.data.resume.filename)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!job) return
    getJobTailoring(job.id).then(res => {
      if (res.data.tailoring) setTailoring(res.data.tailoring)
      else setTailoring(null)
    }).catch(() => setTailoring(null))
    setMessages([{
      role: 'assistant',
      text: `## AI Job Coach\n✅ Resume loaded for **${job.title}** at **${job.company}**\n→ Ask about match, missing skills, or bullet improvements`,
    }])
    setTab('overview')
  }, [job?.id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (!job) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13, fontFamily: FONT, padding: 20, textAlign: 'center' }}>
        Select a job to see resume match insights.
      </div>
    )
  }

  const score = parseInt(job.fit_score) || 0
  const tier = scoreTier(score)
  const missingKws = Array.isArray(tailoring?.missing_keywords) ? tailoring.missing_keywords : []
  const sections = tailoring?.sections || {}
  const sectionNames = Object.keys(sections).filter(k => sections[k]?.improved)

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    const priorMessages = messages.filter((m, i) => !(i === 0 && m.role === 'assistant'))
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await chatWithCoach({ message: msg, history: priorMessages, jobId: job.id, context: 'job' })
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }])
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong.'
      setMessages(prev => [...prev, { role: 'assistant', text: errMsg }])
    } finally {
      setChatLoading(false)
    }
  }

  const TABS = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'insights',  label: 'Insights'  },
    { id: 'coach',     label: 'AI Coach'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: FONT }}>

      {/* Score header */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, textAlign: 'right' }}>
        {score > 0 ? (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 800, color: tier.color, lineHeight: 1 }}>
              {score}%
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tier.color, marginTop: 2 }}>{tier.label}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No score yet</div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer', background: 'transparent',
            fontSize: 12, fontWeight: tab === id ? 700 : 500,
            color: tab === id ? '#6366f1' : '#94a3b8',
            borderBottom: `2px solid ${tab === id ? '#6366f1' : 'transparent'}`,
            fontFamily: FONT, marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {tailoring ? (
            <>
              {/* ATS improvement */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: FONT }}>ATS Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: '#94a3b8' }}>{tailoring.ats_score_before}</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: '#15803d' }}>{tailoring.ats_score_after}</span>
                  {tailoring.ats_score_after > tailoring.ats_score_before && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 999, padding: '3px 9px', fontFamily: FONT }}>
                      +{tailoring.ats_score_after - tailoring.ats_score_before} pts
                    </span>
                  )}
                </div>
              </div>

              {/* Sections customized */}
              {sectionNames.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, fontFamily: FONT }}>Sections Customized</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sectionNames.map(s => (
                      <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', textTransform: 'capitalize', fontFamily: FONT }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing keywords */}
              {missingKws.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, fontFamily: FONT }}>Top Missing Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {missingKws.slice(0, 6).map((kw, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontFamily: FONT }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
              <Sparkles size={28} strokeWidth={1.5} color="#c7d2fe" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, fontFamily: FONT }}>No analysis yet</div>
              <div style={{ fontSize: 12, fontFamily: FONT, marginBottom: 16 }}>Run a tailor analysis to see ATS scores, missing keywords, and section improvements.</div>
              <button onClick={onTailor} style={{
                padding: '9px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: FONT,
              }}>
                <Sparkles size={13} strokeWidth={2} /> Tailor Resume
              </button>
            </div>
          )}

          {/* View tailoring button */}
          {tailoring && (
            <button onClick={onTailor} style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Sparkles size={13} strokeWidth={2} /> View Tailoring Suggestions
            </button>
          )}
        </div>
      )}

      {/* Insights tab */}
      {tab === 'insights' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {score > 0 ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: FONT, marginBottom: 4 }}>Job Insights</div>
              {[
                { icon: '🎯', label: 'High Demand Role', desc: `${job.title}s are in high demand in your location.`, color: '#f0fdf4', border: '#bbf7d0' },
                { icon: '⚡', label: 'Competitive', desc: 'This role has high competition. Tailoring your resume can help.', color: '#fffbeb', border: '#fde68a' },
                { icon: '✅', label: 'Quick Applicant', desc: 'Apply early. Most successful applicants applied within 3 days.', color: '#f0f9ff', border: '#bae6fd' },
              ].map(({ icon, label, desc, color, border }) => (
                <div key={label} style={{ padding: '12px 14px', background: color, border: `1px solid ${border}`, borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 3, fontFamily: FONT }}>{icon} {label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, fontFamily: FONT }}>{desc}</div>
                </div>
              ))}
              {missingKws.length > 0 && (
                <div style={{ padding: '12px 14px', background: '#fafbff', border: '1px solid #e0e7ff', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, fontFamily: FONT }}>Application Tips</div>
                  {[
                    `Highlight your ${missingKws[0] || 'core'} experience`,
                    'Include metrics and outcomes in your resume',
                    'Tailor your resume to include missing keywords',
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <CheckCircle2 size={13} strokeWidth={2.5} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: '#475569', fontFamily: FONT }}>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>
              Score this job to see insights.
            </div>
          )}
        </div>
      )}

      {/* AI Coach tab */}
      {tab === 'coach' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ResumeAttachedChip filename={resumeFilename} compact />
            {messages.length <= 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['Review my match', 'What skills am I missing?', 'Improve my summary'].map(q => (
                  <button key={q} onClick={() => setChatInput(q)} style={{
                    padding: '5px 11px', borderRadius: 999, background: '#eef2ff', border: '1px solid #c7d2fe',
                    color: '#4f46e5', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: FONT,
                  }}>{q}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} text={m.text} compact />
            ))}
            {chatLoading && <ChatTypingIndicator compact />}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
              placeholder="Ask about this job..."
              style={{ flex: 1, borderRadius: 10, border: '1px solid #e2e8f0', padding: '9px 13px', fontSize: 13, fontFamily: FONT, outline: 'none' }} />
            <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}
              style={{ width: 38, height: 38, borderRadius: 10, background: '#6366f1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tailor Drawer ─────────────────────────────────────────────────────────────
function TailorDrawer({ job, onClose }) {
  const [activeTab, setActiveTab] = useState('ats')
  const [tailoring, setTailoring] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [jdText, setJdText] = useState('')
  const chatEndRef = useRef()

  useEffect(() => {
    if (!job) return
    getJobTailoring(job.id).then(res => {
      if (res.data.tailoring) setTailoring(res.data.tailoring)
    }).catch(() => {})
    setJdText(job.description || '')
  }, [job?.id])

  if (!job) return null

  const handleAnalyze = async () => {
    if (!jdText.trim()) { toast.error('Job description is required'); return }
    setAnalyzing(true)
    try {
      const res = await analyzeJobResume(job.id, jdText)
      const data = res.data
      const saved = await saveJobTailoring(job.id, {
        jd_text: jdText,
        ats_score_before: data.ats_score_before,
        ats_score_after: data.ats_score_after,
        sections: data.improvements || {},
        missing_keywords: data.missing_keywords || [],
      })
      setTailoring(saved.data.tailoring)
      toast.success('Analysis complete!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const TABS = [
    { id: 'ats',          label: 'ATS Analysis' },
    { id: 'improvements', label: 'Improvements' },
  ]
  const sections = tailoring?.sections || {}

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 999 }} onClick={onClose} />
      <div style={{ position: 'fixed', right: 0, top: 64, bottom: 0, width: 500, background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: FONT }}>Tailor Resume</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontFamily: FONT }}>{job.title} · {job.company}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 14, borderBottom: '1px solid #f1f5f9', marginBottom: -1 }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
                fontSize: 13, fontWeight: activeTab === id ? 700 : 500,
                color: activeTab === id ? '#6366f1' : '#94a3b8',
                borderBottom: `2px solid ${activeTab === id ? '#6366f1' : 'transparent'}`,
                fontFamily: FONT,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {activeTab === 'ats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!tailoring ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8, fontFamily: FONT }}>Job Description</label>
                    <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={9}
                      placeholder="Paste the job description here..."
                      style={{ width: '100%', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 14px', fontSize: 13, fontFamily: FONT, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }} />
                  </div>
                  <button onClick={handleAnalyze} disabled={analyzing} style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, background: analyzing ? '#f1f5f9' : '#6366f1',
                    color: analyzing ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {analyzing ? <><div style={{ width: 16, height: 16, border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing...</> : <><Sparkles size={15} /> Analyze Resume</>}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8fafc', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>{tailoring.ats_score_before}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginTop: 4, fontFamily: FONT }}>Before</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><ChevronRight size={24} color="#6366f1" /></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>{tailoring.ats_score_after}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginTop: 4, fontFamily: FONT }}>After</div>
                    </div>
                  </div>
                  {(Array.isArray(tailoring.missing_keywords) ? tailoring.missing_keywords : []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: FONT }}>Missing Keywords</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(Array.isArray(tailoring.missing_keywords) ? tailoring.missing_keywords : []).slice(0, 10).map((kw, i) => (
                          <span key={i} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 11px', fontSize: 12, fontWeight: 600, fontFamily: FONT }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {[
                    { label: 'Skill Match',      pct: Math.min(99, Math.round((tailoring.ats_score_before || 0) * 1.02)), color: '#6366f1' },
                    { label: 'Keyword Match',    pct: Math.min(99, Math.round((tailoring.ats_score_before || 0) * 0.90)), color: '#0891b2' },
                    { label: 'Experience Match', pct: Math.min(99, Math.round((tailoring.ats_score_before || 0) * 0.82)), color: '#059669' },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: FONT }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setTailoring(null)} style={{ padding: '9px 0', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
                    Re-analyze
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'improvements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!tailoring ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>Run ATS Analysis first to see improvements.</div>
              ) : Object.keys(sections).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>No improvements found.</div>
              ) : (
                Object.entries(sections).map(([key, data]) => {
                  const improved = safeStr(data?.improved)
                  if (!improved) return null
                  const reason   = safeStr(data?.reason)
                  const kws      = safeKeywords(data?.keywords_added)
                  return (
                    <div key={key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', background: '#fafbff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT }}>{key}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {kws.slice(0, 3).map((kw, i) => (
                            <span key={i} style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: FONT }}>+{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <ChatMarkdown content={improved} />
                        {reason && (
                          <div style={{
                            marginTop: 10, padding: '10px 14px',
                            background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10,
                            fontSize: 13, color: '#4f46e5', fontFamily: FONT, lineHeight: 1.65,
                            display: 'flex', gap: 8, alignItems: 'flex-start',
                          }}>
                            <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
                            <span>{reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Resize Divider ────────────────────────────────────────────────────────────
function ResizeDivider({ onDrag }) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive]   = useState(false)

  const handleMouseDown = (e) => {
    e.preventDefault()
    setActive(true)
    const startX = e.clientX
    const onMove = (ev) => onDrag(ev.clientX - startX)
    const onUp   = () => {
      setActive(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 6, flexShrink: 0, cursor: 'col-resize', zIndex: 10,
        position: 'relative', userSelect: 'none',
        background: 'transparent',
      }}
    >
      {/* Visible divider line */}
      <div style={{
        position: 'absolute', left: 2, top: 0, bottom: 0, width: 2,
        borderRadius: 999,
        background: active ? '#6366f1' : hovered ? '#a5b4fc' : '#f1f5f9',
        transition: active ? 'none' : 'background 0.15s',
      }} />
      {/* Drag handle dots — visible on hover */}
      {(hovered || active) && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', gap: 3,
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#6366f1' : '#a5b4fc' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Jobs Page ─────────────────────────────────────────────────────────────
export default function Jobs() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initFilter = searchParams.get('filter') || ''
  const [activeFilter, setActiveFilter] = useState(initFilter)
  const [search,      setSearch]      = useState('')
  const [jobs,        setJobs]        = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [skipJob,     setSkipJob]     = useState(null)
  const [tailorJob,   setTailorJob]   = useState(null)

  // Panel widths — center is flex:1 (fills remainder)
  const [leftWidth,  setLeftWidth]  = useState(300)
  const [rightWidth, setRightWidth] = useState(300)
  const containerRef = useRef()
  const leftWidthRef  = useRef(300)
  const rightWidthRef = useRef(300)

  // Keep refs in sync so drag callbacks always see latest values
  useEffect(() => { leftWidthRef.current  = leftWidth  }, [leftWidth])
  useEffect(() => { rightWidthRef.current = rightWidth }, [rightWidth])

  const MIN_PANEL = 180   // px — minimum for any panel
  const MIN_CENTER = 320  // px — minimum for center panel

  const handleLeftDrag = useCallback((delta) => {
    const containerW = containerRef.current?.offsetWidth || window.innerWidth
    const maxLeft = containerW - rightWidthRef.current - MIN_CENTER
    const next = Math.min(maxLeft, Math.max(MIN_PANEL, leftWidthRef.current + delta))
    setLeftWidth(Math.round(next))
    leftWidthRef.current = Math.round(next)
  }, [])

  const handleRightDrag = useCallback((delta) => {
    const containerW = containerRef.current?.offsetWidth || window.innerWidth
    const maxRight = containerW - leftWidthRef.current - MIN_CENTER
    const next = Math.min(maxRight, Math.max(MIN_PANEL, rightWidthRef.current - delta))
    setRightWidth(Math.round(next))
    rightWidthRef.current = Math.round(next)
  }, [])

  useEffect(() => { loadData() }, [activeFilter])

  async function loadData() {
    setLoading(true)
    try {
      const res = await getJobsByFilter(activeFilter)
      const loaded = res.data.jobs || []
      setJobs(loaded)
      if (loaded.length > 0 && !selectedJob) setSelectedJob(loaded[0])
    } catch {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const updateJob = (id, patch) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
    if (selectedJob?.id === id) setSelectedJob(prev => ({ ...prev, ...patch }))
  }

  const handleApply = async () => {
    if (!selectedJob) return
    try {
      await applyJob(selectedJob.id)
      updateJob(selectedJob.id, { is_applied: true })
      toast.success('Marked as applied!')
    } catch { toast.error('Failed') }
  }

  const handleSave = async () => {
    if (!selectedJob) return
    try {
      const res = await saveJob(selectedJob.id)
      updateJob(selectedJob.id, { is_saved: res.data.saved })
      toast(res.data.saved ? 'Job saved!' : 'Removed from saved.')
    } catch { toast.error('Failed') }
  }

  const handleSkipConfirm = async (reason) => {
    if (!skipJob) return
    try {
      await skipJobWithReason(skipJob.id, reason)
      updateJob(skipJob.id, { is_skipped: true })
      toast(`Skipped ${skipJob.title}`)
      setSkipJob(null)
    } catch { toast.error('Failed') }
  }

  const filteredJobs = jobs.filter(j =>
    !search ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    '':          jobs.length,
    strong_fit:  jobs.filter(j => (parseInt(j.fit_score) || 0) >= 80).length,
    applied:     jobs.filter(j => j.is_applied).length,
    saved:       jobs.filter(j => j.is_saved).length,
    skipped:     jobs.filter(j => j.is_skipped).length,
  }

  const FILTERS = [
    { id: '',           label: 'All'        },
    { id: 'strong_fit', label: 'Strong Fit' },
    { id: 'applied',    label: 'Applied'    },
    { id: 'saved',      label: 'Saved'      },
    { id: 'skipped',    label: 'Skipped'    },
  ]

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#f8fafc', fontFamily: FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>

      {/* ── LEFT: Job list ── */}
      <div style={{ width: leftWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>

        {/* Search + filter */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              style={{ width: '100%', padding: '9px 32px 9px 32px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box', color: '#334155' }} />
            <Filter size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTERS.map(({ id, label }) => {
              const active = activeFilter === id
              const count = counts[id] ?? 0
              return (
                <button key={id} onClick={() => setActiveFilter(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: active ? '#6366f1' : '#f8fafc',
                  border: `1px solid ${active ? '#6366f1' : '#e2e8f0'}`,
                  color: active ? '#fff' : '#64748b',
                  fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: FONT,
                }}>
                  {label}
                  <span style={{ fontSize: 10, fontWeight: 800, background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: active ? '#fff' : '#94a3b8', borderRadius: 999, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Count */}
        <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid #f8fafc' }}>
          {filteredJobs.length} jobs found
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ height: 13, background: '#f1f5f9', borderRadius: 6, width: '80%' }} />
                    <div style={{ height: 11, background: '#f8fafc', borderRadius: 6, width: '55%' }} />
                  </div>
                </div>
              </div>
            ))
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>
              {search ? 'No jobs match your search.' : `No ${activeFilter || 'jobs'} yet.`}
            </div>
          ) : (
            filteredJobs.map(job => (
              <MiniJobCard key={job.id} job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => setSelectedJob(job)} />
            ))
          )}
        </div>
      </div>

      {/* ── DIVIDER 1: left ↔ center ── */}
      <ResizeDivider onDrag={handleLeftDrag} />

      {/* ── CENTER: Job detail ── */}
      <div style={{ flex: 1, minWidth: MIN_CENTER, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        <JobDetailCenter
          job={selectedJob}
          onApply={handleApply}
          onSave={handleSave}
          onSkip={() => setSkipJob(selectedJob)}
          onTailor={() => setTailorJob(selectedJob)}
        />
      </div>

      {/* ── DIVIDER 2: center ↔ right ── */}
      <ResizeDivider onDrag={handleRightDrag} />

      {/* ── RIGHT: Match panel ── */}
      <div style={{ width: rightWidth, flexShrink: 0, background: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <MatchPanel job={selectedJob} onTailor={() => setTailorJob(selectedJob)} />
      </div>

      {/* Modals */}
      {skipJob && <SkipModal job={skipJob} onConfirm={handleSkipConfirm} onClose={() => setSkipJob(null)} />}
      {tailorJob && <TailorDrawer job={tailorJob} onClose={() => setTailorJob(null)} />}
    </div>
  )
}
