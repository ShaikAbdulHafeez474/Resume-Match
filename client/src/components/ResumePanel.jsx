import { useState } from 'react'
import { Upload, MapPin, Briefcase, ExternalLink, ArrowRight, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FIT_TIER = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'Strong Fit',  bg: '#eff6ff', border: '#06b6d4' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'Good Fit',    bg: '#f0fdf4', border: '#10b981' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'Decent Fit',  bg: '#fff7ed', border: '#f59e0b' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'Weak Fit',    bg: '#f8fafc', border: '#94a3b8' },
}

function getTier(score) {
  const s = parseInt(score) || 0
  if (s >= 80) return { key: 'strong', ...FIT_TIER.strong }
  if (s >= 65) return { key: 'good',   ...FIT_TIER.good   }
  if (s >= 45) return { key: 'decent', ...FIT_TIER.decent  }
  return           { key: 'weak',   ...FIT_TIER.weak   }
}

const CHIP_COLORS = [
  { bg: 'var(--pink-soft)',   color: 'var(--pink)',   border: 'var(--pink-border)'   },
  { bg: 'var(--blue-soft)',   color: 'var(--blue)',   border: 'var(--blue-border)'   },
  { bg: 'var(--green-soft)',  color: 'var(--green)',  border: 'var(--green-border)'  },
  { bg: 'var(--orange-soft)', color: 'var(--orange)', border: 'var(--orange-border)' },
  { bg: 'var(--purple-soft)', color: 'var(--purple)', border: 'var(--purple-border)' },
  { bg: 'var(--indigo-soft)', color: 'var(--indigo)', border: 'var(--indigo-border)' },
]

function parseSkills(match_skills) {
  if (Array.isArray(match_skills)) return match_skills
  if (typeof match_skills === 'string')
    return match_skills.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function ProgressBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ job, skills, resume, onUploadClick }) {
  const analysis = resume?.analysis || null
  const targetRoles = analysis?.target_roles || []

  const desc = job.description || ''
  const sentences = desc.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean)
  const responsibilities = sentences.slice(0, 5)
  const aboutText = desc.length > 300 ? desc.slice(0, 300) + '…' : desc

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {aboutText && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>About the Role</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>{aboutText}</p>
        </div>
      )}

      {responsibilities.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Key Responsibilities</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {responsibilities.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0, color: '#6366f1', fontWeight: 800, marginTop: 1 }}>•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Core Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {skills.map((skill, i) => {
              const c = CHIP_COLORS[i % CHIP_COLORS.length]
              return (
                <span key={skill} style={{
                  background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                  borderRadius: 8, padding: '4px 10px',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                }}>
                  {skill}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {targetRoles.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Target Roles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {targetRoles.slice(0, 5).map(role => (
              <span key={role} style={{
                background: 'var(--indigo-soft)', color: 'var(--indigo)',
                border: '1px solid var(--indigo-border)', borderRadius: 8,
                padding: '4px 10px', fontSize: 12, fontWeight: 700,
              }}>
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onUploadClick}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          width: '100%', padding: '10px 0', borderRadius: 10,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', fontWeight: 700, fontSize: 13,
          border: 'none', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)' }}
      >
        <Upload size={14} strokeWidth={2.5} /> Update Resume
      </button>
    </div>
  )
}

// ── Tab: Match Breakdown ─────────────────────────────────────────────────────
function MatchBreakdownTab({ job }) {
  const navigate = useNavigate()
  const score = parseInt(job.fit_score) || 0
  const scoreAfter = Math.min(score + 24, 100)
  const tier = getTier(score)

  const bars = [
    { label: 'Skills Match',      pct: Math.min(100, Math.round(score * 0.95)), color: '#6366f1' },
    { label: 'Keyword Match',     pct: Math.min(100, Math.round(score * 0.85)), color: '#06b6d4' },
    { label: 'Experience Match',  pct: Math.min(100, Math.round(score * 0.78)), color: '#10b981' },
    { label: 'Education Match',   pct: Math.min(100, Math.round(score * 0.70)), color: '#f59e0b' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Score before / after */}
      <div style={{
        background: 'var(--bg-soft)', borderRadius: 14,
        border: '1px solid var(--border-light)',
        padding: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 12,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Current ATS</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 800, lineHeight: 1,
            background: tier.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {score}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: tier.border, marginTop: 4 }}>{tier.label}</div>
        </div>

        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>After Tailoring</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 800, lineHeight: 1,
            background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {scoreAfter}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginTop: 4 }}>Potential</div>
        </div>
      </div>

      {/* Progress bars */}
      <div>
        {bars.map(bar => <ProgressBar key={bar.label} {...bar} />)}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate(`/tailor/${job.id}`)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            background: 'var(--bg-soft)', border: '1px solid var(--border-medium)',
            color: 'var(--text-dark)', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
        >
          View Analysis
        </button>
        <button
          onClick={() => navigate(`/tailor/${job.id}`)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}
        >
          <Sparkles size={14} strokeWidth={2} /> Tailor Resume
        </button>
      </div>
    </div>
  )
}

// ── Tab: Key Skills ──────────────────────────────────────────────────────────
function KeySkillsTab({ skills }) {
  if (!skills.length) {
    return <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>No skills data available.</p>
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {skills.map((skill, i) => {
        const c = CHIP_COLORS[i % CHIP_COLORS.length]
        return (
          <span key={skill} style={{
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            borderRadius: 10, padding: '7px 14px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
          }}>
            {skill}
          </span>
        )
      })}
    </div>
  )
}

// ── Tab: Job Details ─────────────────────────────────────────────────────────
function JobDetailsTab({ job }) {
  const rows = [
    { label: 'Source',  value: job.source ? job.source.charAt(0).toUpperCase() + job.source.slice(1) : '—' },
    { label: 'Job Type',value: job.job_type || '—' },
    { label: 'Location',value: job.location || '—' },
    { label: 'Salary',  value: job.salary_display || 'Not disclosed' },
    { label: 'Posted',  value: job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--bg-soft)', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {rows.map(({ label, value }, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{value}</span>
          </div>
        ))}
      </div>

      {job.description && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Full Description</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
        </div>
      )}

      {job.apply_url && (
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 0', borderRadius: 10,
            background: 'var(--bg-soft)', border: '1px solid var(--border-medium)',
            color: 'var(--text-dark)', fontWeight: 700, fontSize: 13,
            textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <ExternalLink size={14} strokeWidth={2} /> Open Job Posting
        </a>
      )}
    </div>
  )
}

// ── Placeholder when no job selected ────────────────────────────────────────
function NoJobPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16, padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'var(--indigo-soft)', border: '2px dashed var(--indigo-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Briefcase size={28} strokeWidth={1.5} color="var(--indigo)" />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 6 }}>Select a job to see details</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Click any job card on the left to view the full job details, match breakdown, and skills.
        </div>
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview'        },
  { id: 'match',     label: 'Match Breakdown' },
  { id: 'skills',    label: 'Key Skills'      },
  { id: 'details',   label: 'Job Details'     },
]

export default function JobDetailPanel({ job, resume, stats, onUploadClick, onFetchClick, userName }) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!job) return <NoJobPlaceholder />

  const skills = parseSkills(job.match_skills)
  const score  = parseInt(job.fit_score) || 0
  const tier   = getTier(score)
  const companyInitials = (job.company || 'JB').slice(0, 2).toUpperCase()

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Gradient header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%)',
        padding: '18px 18px 16px',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Score badge — top right */}
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 12, padding: '8px 14px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1,
          }}>
            {score}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            {tier.label}
          </div>
        </div>

        {/* Company avatar + job info */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingRight: 88 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 16, color: '#fff',
          }}>
            {companyInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 3 }}>
              {job.title || 'Untitled Position'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.82)', marginBottom: 8 }}>
              {job.company || 'Unknown Company'}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {job.job_type && (
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                  {job.job_type}
                </span>
              )}
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                2-5 Yrs Exp
              </span>
              {job.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                  <MapPin size={10} strokeWidth={2} />{job.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-light)',
        background: '#fff', flexShrink: 0,
        overflowX: 'auto',
      }}>
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: '11px 14px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                fontSize: 12, fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--indigo)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--indigo)' : '2px solid transparent',
                whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'overview' && (
          <OverviewTab job={job} skills={skills} resume={resume} onUploadClick={onUploadClick} />
        )}
        {activeTab === 'match' && (
          <MatchBreakdownTab job={job} />
        )}
        {activeTab === 'skills' && (
          <KeySkillsTab skills={skills} />
        )}
        {activeTab === 'details' && (
          <JobDetailsTab job={job} />
        )}
      </div>
    </div>
  )
}
