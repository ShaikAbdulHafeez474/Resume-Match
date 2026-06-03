import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { safeStr, safeKeywords } from '../lib/sectionUtils'
import { ChatMarkdown } from '../components/ChatBubble'
import {
  ArrowLeft, ArrowRight, Sparkles, CheckCircle2,
  FileText, BarChart2, Lightbulb, BookOpen,
  Copy, RefreshCw, ChevronRight, TrendingUp,
  AlertCircle, CheckCircle, Zap, Eye, X
} from 'lucide-react'
import { getJobById, getActiveResume, analyzeJobResume, saveJobTailoring } from '../lib/api'

const STEPS = [
  { id: 1, label: 'Job Description', icon: FileText },
  { id: 2, label: 'Analysis',        icon: BarChart2 },
  { id: 3, label: 'Improvements',    icon: Lightbulb },
  { id: 4, label: 'Summary',         icon: BookOpen  },
]

const SECTION_TABS = ['Summary', 'Experience', 'Skills', 'Projects', 'Others']

const SECTION_COLORS = {
  summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe', light: '#e0e7ff' },
  experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', light: '#dbeafe' },
  skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', light: '#dcfce7' },
  projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff', light: '#f3e8ff' },
  others:     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', light: '#ffedd5' },
}

export default function TailorResume() {
  const { jobId }  = useParams()
  const navigate   = useNavigate()

  const [step, setStep]           = useState(1)
  const [job, setJob]             = useState(null)
  const [resume, setResume]       = useState(null)
  const [jdText, setJdText]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState('Summary')
  const [showRawText, setShowRawText] = useState(false)

  // Analysis results
  const [atsScoreBefore, setAtsScoreBefore] = useState(null)
  const [atsScoreAfter, setAtsScoreAfter]   = useState(null)
  const [missingKeywords, setMissingKeywords] = useState([])
  const [weakAreas, setWeakAreas]           = useState([])
  const [strongMatches, setStrongMatches]   = useState([])
  const [improvements, setImprovements]     = useState({})

  // Load job + resume
  useEffect(() => {
    async function load() {
      try {
        const [jobRes, resumeRes] = await Promise.all([getJobById(jobId), getActiveResume()])
        setJob(jobRes.data.job)
        setResume(resumeRes.data.resume)
      } catch {
        toast.error('Failed to load data')
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jobId])

  const handleAnalyze = async () => {
    if (!jdText.trim() || jdText.trim().length < 50) {
      toast.error('Please paste a proper job description (at least 50 characters)')
      return
    }
    if (!resume) {
      toast.error('No resume found. Please upload your resume first.')
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeJobResume(jobId, jdText)
      const data = res.data
      setAtsScoreBefore(data.ats_score_before)
      setAtsScoreAfter(data.ats_score_after)
      setMissingKeywords(data.missing_keywords || [])
      setWeakAreas(data.weak_areas || [])
      setStrongMatches(data.strong_matches || [])
      setImprovements(data.improvements || {})
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveJobTailoring(jobId, {
        jd_text: jdText,
        ats_score_before: atsScoreBefore,
        ats_score_after: atsScoreAfter,
        sections: Object.fromEntries(
          Object.entries(improvements).map(([k, v]) => [k, {
            improved: v.improved,
            keywords_added: v.keywords_added || [],
          }])
        )
      })
      toast.success('Improvements saved and mapped to this job!')
      setStep(4)
    } catch {
      toast.error('Failed to save improvements')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg-page)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--indigo-border)', borderTopColor: 'var(--indigo)', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{ height: 64, flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <ArrowLeft size={14} strokeWidth={2.5} /> Back
        </button>

        {/* Job info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>Tailor Resume</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
            {job?.title} · {job?.company}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {STEPS.map((s, i) => {
            const done    = step > s.id
            const active  = step === s.id
            const Icon    = s.icon
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: active ? 'var(--indigo)' : done ? 'var(--green-soft)' : 'var(--bg-soft)', border: `1px solid ${active ? 'var(--indigo)' : done ? 'var(--green-border)' : 'var(--border-light)'}` }}>
                  {done
                    ? <CheckCircle2 size={13} strokeWidth={2.5} color="#16a34a" />
                    : <Icon size={13} strokeWidth={2} color={active ? '#fff' : 'var(--text-muted)'} />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : done ? '#16a34a' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={14} strokeWidth={2} color="var(--text-disabled)" style={{ margin: '0 2px' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* ════ STEP 1 — JD INPUT ════ */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

            {/* Left — JD paste */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px 24px 28px', overflowY: 'auto' }}>
              <div style={{ marginBottom: 6 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 4 }}>
                  Job Description
                </h2>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                  Paste the complete job description. We'll analyze it against your resume.
                </p>
              </div>

              {/* Job info pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={15} strokeWidth={2} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>Tailoring for: {job?.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{job?.company} · {job?.location}</div>
                </div>
              </div>

              {/* JD Textarea */}
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here...

Include:
• Job responsibilities
• Required qualifications
• Preferred skills
• About the company

The more complete the JD, the better the AI analysis."
                style={{
                  flex: 1, minHeight: 320,
                  padding: '14px 16px', borderRadius: 12,
                  border: '1px solid var(--border-medium)',
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--text-dark)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  lineHeight: 1.7, outline: 'none', resize: 'none',
                  background: '#fff',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--indigo)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                  {jdText.length} characters {jdText.length < 50 ? '(need at least 50)' : '✓'}
                </span>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || jdText.trim().length < 50}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 12,
                    background: (analyzing || jdText.trim().length < 50) ? 'var(--border-light)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: (analyzing || jdText.trim().length < 50) ? 'var(--text-muted)' : '#fff',
                    fontWeight: 700, fontSize: 14, border: 'none',
                    cursor: (analyzing || jdText.trim().length < 50) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: (analyzing || jdText.trim().length < 50) ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >
                  {analyzing
                    ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing...</>
                    : <><Sparkles size={15} strokeWidth={2.5} /> Analyze Resume →</>}
                </button>
              </div>
            </div>

            {/* Right — Your resume preview info */}
            <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border-light)', background: '#fff', padding: 20, overflowY: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Your Current Resume</div>

              {resume ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Resume card */}
                  <div style={{ background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, color: '#fff' }}>
                        {(resume.analysis?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>{resume.analysis?.name || 'Your Name'}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{resume.analysis?.current_title || 'Professional'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Last updated: {resume.created_at ? new Date(resume.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                    </div>
                  </div>

                  {/* Preview Resume button */}
                  {resume?.raw_text && (
                    <button
                      onClick={() => setShowRawText(true)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        width: '100%', padding: '10px 0', borderRadius: 10,
                        background: 'var(--bg-soft)', border: '1px solid var(--border-medium)',
                        color: 'var(--text-body)', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--indigo-soft)'; e.currentTarget.style.borderColor = 'var(--indigo-border)'; e.currentTarget.style.color = 'var(--indigo)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-body)' }}
                    >
                      <Eye size={14} strokeWidth={2} /> Preview Resume
                    </button>
                  )}

                  {/* ATS tips */}
                  <div style={{ background: 'var(--green-soft)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={13} strokeWidth={2.5} /> ATS Tips
                    </div>
                    {[
                      'Add more relevant keywords from the JD',
                      'Quantify your achievements',
                      'Use action verbs',
                      'Match exact skill names from JD',
                    ].map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', marginTop: 5, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#166534', lineHeight: 1.5 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <AlertCircle size={36} strokeWidth={1.5} color="var(--text-disabled)" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>No resume found. Please upload your resume from the dashboard first.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ STEP 2 — ANALYSIS ════ */}
        {step === 2 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 4 }}>AI Analysis Results</h2>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Here's how your resume matches the job description</p>
                </div>
                <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <RefreshCw size={12} strokeWidth={2.5} /> Re-analyze
                </button>
              </div>

              {/* ATS Score overview */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Current ATS Score</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 52, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>{atsScoreBefore}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>/100</div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <ArrowRight size={32} strokeWidth={1.5} color="var(--indigo)" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green-soft)', border: '1px solid var(--green-border)', borderRadius: 999, padding: '6px 16px' }}>
                    <TrendingUp size={14} strokeWidth={2} color="#16a34a" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                      +{atsScoreAfter - atsScoreBefore} points improvement potential
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Potential ATS Score</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 52, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{atsScoreAfter}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>/100</div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-light)', padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Current</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Potential</span>
                </div>
                <div style={{ position: 'relative', height: 12, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${atsScoreBefore}%`, background: 'linear-gradient(90deg,#94a3b8,#64748b)', borderRadius: 999, transition: 'width 1s ease' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${atsScoreAfter}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)', borderRadius: 999, opacity: 0.35 }} />
                </div>
              </div>

              {/* 3 columns — Missing, Weak, Strong */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>

                {/* Missing Keywords */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #fed7aa', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 16px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} strokeWidth={2} color="#f59e0b" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>Missing Keywords</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {missingKeywords.slice(0, 8).map((kw, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>{kw}</span>
                      </div>
                    ))}
                    {missingKeywords.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>None found!</span>}
                  </div>
                </div>

                {/* Weak Areas */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #fecaca', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} strokeWidth={2} color="#ef4444" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#991b1b' }}>Weak Areas</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {weakAreas.slice(0, 6).map((area, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: 4 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)', lineHeight: 1.5 }}>{area}</span>
                      </div>
                    ))}
                    {weakAreas.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>None found!</span>}
                  </div>
                </div>

                {/* Strong Matches */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--green-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--green-soft)', borderBottom: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={15} strokeWidth={2} color="#16a34a" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#14532d' }}>Strong Matches</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {strongMatches.slice(0, 6).map((match, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <CheckCircle2 size={12} strokeWidth={2.5} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)', lineHeight: 1.5 }}>{match}</span>
                      </div>
                    ))}
                    {strongMatches.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Analyzing...</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                  View Improvements <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 3 — IMPROVEMENTS ════ */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tab bar */}
            <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--border-light)', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {SECTION_TABS.map(tab => {
                const key = tab.toLowerCase()
                const c   = SECTION_COLORS[key] || SECTION_COLORS.others
                const active = activeTab === tab
                const hasData = improvements[key]?.improved
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '14px 18px', borderRadius: 0,
                    background: 'none', border: 'none',
                    borderBottom: active ? `3px solid ${c.color}` : '3px solid transparent',
                    color: active ? c.color : 'var(--text-muted)',
                    fontWeight: active ? 800 : 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    {tab}
                    {hasData && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />}
                  </button>
                )
              })}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, padding: '8px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                  Live ATS Score:
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#10b981' }}>
                    {atsScoreAfter}/100
                  </span>
                </span>
              </div>
            </div>

            {/* Section content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', padding: '20px 28px', gap: 20 }}>
              {(() => {
                const key = activeTab.toLowerCase()
                const c   = SECTION_COLORS[key] || SECTION_COLORS.others
                const data = improvements[key]

                return (
                  <>
                    {/* Left — AI Improved */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Improved {activeTab}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--green-soft)', color: '#16a34a', border: '1px solid var(--green-border)', borderRadius: 999, padding: '3px 10px' }}>Recommended</span>
                        </div>
                        {data?.improved && (
                          <button onClick={() => copyToClipboard(safeStr(data.improved))} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <Copy size={12} strokeWidth={2} /> Copy
                          </button>
                        )}
                      </div>

                      <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: `1px solid ${c.border}`, padding: '16px 18px', overflowY: 'auto' }}>
                        {data?.improved ? (
                          <ChatMarkdown content={safeStr(data.improved)} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                            <Lightbulb size={36} strokeWidth={1.5} color="var(--text-disabled)" />
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>
                              No improvements generated for this section yet.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Keywords added */}
                      {safeKeywords(data?.keywords_added).length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords Added</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {safeKeywords(data.keywords_added).map((kw, i) => (
                              <span key={i} style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                                +{kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Why this change */}
                      {data?.reason && (
                        <div style={{ marginTop: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#4f46e5', lineHeight: 1.65, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{safeStr(data.reason)}</p>
                        </div>
                      )}
                    </div>

                    {/* Right — ATS impact + navigation */}
                    <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* ATS impact */}
                      {data && (
                        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 12 }}>ATS Impact</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: '#94a3b8' }}>{atsScoreBefore}</div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Before</div>
                            </div>
                            <ArrowRight size={20} strokeWidth={1.5} color="var(--indigo)" />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: '#10b981' }}>{atsScoreAfter}</div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>After</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, background: data.ats_impact === 'High' ? 'var(--green-soft)' : 'var(--orange-soft)', border: `1px solid ${data.ats_impact === 'High' ? 'var(--green-border)' : 'var(--orange-border)'}`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: data.ats_impact === 'High' ? '#16a34a' : '#ea580c' }}>
                              ATS Impact: {data.ats_impact || 'Medium'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Section navigation */}
                      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 10 }}>All Sections</div>
                        {SECTION_TABS.map(tab => {
                          const k = tab.toLowerCase()
                          const sc = SECTION_COLORS[k] || SECTION_COLORS.others
                          const hasD = improvements[k]?.improved
                          return (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              width: '100%', padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                              background: activeTab === tab ? sc.bg : 'none',
                              border: `1px solid ${activeTab === tab ? sc.border : 'transparent'}`,
                              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === tab ? sc.color : 'var(--text-body)' }}>{tab}</span>
                              {hasD && <CheckCircle2 size={13} strokeWidth={2.5} color="#10b981" />}
                            </button>
                          )
                        })}
                      </div>

                      {/* Save button */}
                      <button onClick={handleSave} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '13px 0', borderRadius: 12, width: '100%',
                        background: saving ? 'var(--border-light)' : 'linear-gradient(135deg,#10b981,#059669)',
                        color: saving ? 'var(--text-muted)' : '#fff',
                        fontWeight: 700, fontSize: 14, border: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                      }}>
                        {saving
                          ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                          : <><CheckCircle2 size={15} strokeWidth={2.5} /> Save & Map to Job</>}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* ════ STEP 4 — SUMMARY ════ */}
        {step === 4 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

              {/* Success banner */}
              <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={28} strokeWidth={2} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Improvements Saved!</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                    Your tailored resume improvements are mapped to <strong>{job?.title}</strong> at {job?.company}.
                    ATS Score: {atsScoreBefore} → {atsScoreAfter} (+{atsScoreAfter - atsScoreBefore} pts)
                  </div>
                </div>
              </div>

              {/* Section summaries */}
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Saved Improvements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(improvements).map(([key, data]) => {
                  if (!data?.improved) return null
                  const c = SECTION_COLORS[key] || SECTION_COLORS.others
                  return (
                    <div key={key} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ padding: '12px 18px', background: c.bg, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{key}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {safeKeywords(data.keywords_added).slice(0, 4).map((kw, i) => (
                            <span key={i} style={{ background: '#fff', color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>+{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                          <button onClick={() => copyToClipboard(safeStr(data.improved))} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <Copy size={12} strokeWidth={2} /> Copy
                          </button>
                        </div>
                        <ChatMarkdown content={safeStr(data.improved)} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => navigate('/dashboard')} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'var(--bg-soft)', border: '1px solid var(--border-medium)', color: 'var(--text-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Back to Jobs
                </button>
                <button onClick={() => { setStep(3); setActiveTab('Summary') }} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  Edit Improvements
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RAW TEXT MODAL ── */}
      {showRawText && resume?.raw_text && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(10,14,26,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowRawText(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '70vw', maxWidth: 800,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-light)',
            animation: 'slideUp 280ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border-light)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} strokeWidth={2} color="var(--indigo)" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>Resume Preview</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {resume.filename || 'Extracted text from your uploaded PDF'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRawText(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <pre style={{
                fontSize: 13, fontWeight: 500, color: 'var(--text-body)',
                lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
              }}>
                {resume.raw_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}