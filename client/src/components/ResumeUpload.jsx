import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { uploadResume } from '../lib/api'

const RESUME_STEPS = [
  { id: 1, label: 'Extracting PDF text' },
  { id: 2, label: 'Analyzing with Gemini AI' },
  { id: 3, label: 'Scraping job platforms' },
  { id: 4, label: 'Scoring jobs against your profile' },
  { id: 5, label: 'Building your results' },
]

function getSteps(searchMode, manualQuery) {
  if (searchMode === 'manual') {
    return [
      { id: 1, label: 'Extracting PDF text' },
      { id: 2, label: 'Analyzing with Gemini AI' },
      { id: 3, label: `Searching for "${manualQuery}" across platforms...` },
      { id: 4, label: 'Loading results...' },
      { id: 5, label: 'Building your results' },
    ]
  }
  return RESUME_STEPS
}

const LOADING_COPY = [
  'Parsing your experience...',
  'Finding matching roles...',
  'Scoring across platforms...',
  'Almost there...',
]

export default function ResumeUpload({ pastResumes = [] }) {
  const [file, setFile]             = useState(null)
  const [dragging, setDragging]     = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError]           = useState(null)
  const [searchMode, setSearchMode] = useState('resume')
  const [manualQuery, setManualQuery] = useState('')
  const [copyIdx, setCopyIdx]       = useState(0)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const handleFile = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return }
    if (f.size > 10 * 1024 * 1024)   { toast.error('File too large. Max 10MB'); return }
    setFile(f)
    setError(null)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const simulateSteps = async () => {
    for (let i = 1; i <= 3; i++) {
      setCurrentStep(i)
      await new Promise(r => setTimeout(r, i === 2 ? 1400 : 700))
    }
  }

  const startCopyRotation = () => {
    let i = 0
    return setInterval(() => { i = (i + 1) % LOADING_COPY.length; setCopyIdx(i) }, 5000)
  }

  const handleAnalyze = async () => {
    if (!file) return
    if (searchMode === 'manual' && !manualQuery.trim()) {
      setError('Please enter a job title or role to search for.')
      return
    }
    setProcessing(true); setError(null)
    simulateSteps()
    const timer = startCopyRotation()

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('searchMode', searchMode)
    if (searchMode === 'manual') formData.append('manualQuery', manualQuery.trim())

    try {
      const res = await uploadResume(formData)
      clearInterval(timer)
      setCurrentStep(5)
      const { resumeId, analysis, totalSaved, searchMode: returnedMode, manualQuery: returnedQuery } = res.data
      // Persist search mode so Results page knows how to render
      localStorage.setItem(`resumatch_mode_${resumeId}`, JSON.stringify({
        searchMode: returnedMode || searchMode,
        manualQuery: returnedQuery || manualQuery,
      }))
      toast.success(`Found ${totalSaved} jobs for ${analysis.name}!`)
      setTimeout(() => navigate(`/results/${resumeId}`), 600)
    } catch (err) {
      clearInterval(timer)
      const msg = err.response?.data?.error || err.message
      setError(msg); toast.error(`Failed: ${msg}`)
      setProcessing(false); setCurrentStep(0)
    }
  }

  // PROCESSING SCREEN
  if (processing) {
    const steps = getSteps(searchMode, manualQuery)
    const progress = Math.round((currentStep / steps.length) * 100)
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left — progress */}
        <div style={{ width: '45%', background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%)', padding: '40px 48px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 'auto' }}>RésuMatch</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 28, lineHeight: 1.2, marginBottom: 8 }}>
              {searchMode === 'manual' ? `Searching for "${manualQuery}"...` : 'Analyzing your resume...'}
            </h2>
            {/* Progress bar */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#fff', borderRadius: 999, transition: 'width 600ms ease', boxShadow: '0 0 12px rgba(255,255,255,0.6)' }} />
            </div>
            {steps.map(step => {
              const done = currentStep > step.id
              const curr = currentStep === step.id
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#22c55e' : curr ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    border: curr ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
                    transition: 'all 300ms',
                  }}>
                    {done && <CheckCircle size={16} color="#fff" strokeWidth={2} />}
                    {curr && <div className="animate-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: curr ? 700 : 500,
                    color: done ? 'rgba(255,255,255,0.9)' : curr ? '#fff' : 'rgba(255,255,255,0.5)',
                    transition: 'color 300ms',
                  }}>
                    {step.label}{curr ? '...' : ''}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 'auto' }}>Usually takes 30–60 seconds</p>
        </div>

        {/* Right — spinner */}
        <div style={{ flex: 1, background: '#f8f9fc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div className="animate-spin" style={{
              width: 80, height: 80, borderRadius: '50%',
              border: '4px solid transparent',
              borderTopColor: '#6366f1',
              borderRightColor: '#8b5cf6',
              borderBottomColor: '#ec4899',
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: 22, color: 'var(--text-dark)', marginBottom: 6 }}>
              {LOADING_COPY[copyIdx]}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Powered by Gemini AI</p>
          </div>
        </div>
      </div>
    )
  }

  // HOME SCREEN
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      {/* LEFT — gradient hero */}
      <div style={{ width: '42%', background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%)', padding: '48px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 'auto' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 14px', color: '#fff', fontWeight: 600, fontSize: 12 }}>
            ✦ AI-Powered
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 42, lineHeight: 1.1 }}>
            Find jobs that actually fit you.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.6 }}>
            Upload your resume, let AI do the work. Get ranked matches from 7 platforms in under a minute.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {[
              'Analyzes your resume with Gemini AI',
              'Searches LinkedIn, Indeed & Naukri',
              'Scores every job against your profile',
            ].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 'auto' }}>
          Trusted by job seekers across India
        </p>
      </div>

      {/* RIGHT — form */}
      <div style={{ flex: 1, background: '#f8f9fc', padding: '40px 48px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>

        {/* Search mode toggle */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            How should we search for jobs?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { value: 'resume', icon: '🧠', title: 'Match from my Resume', desc: 'AI reads your resume and finds best matches' },
              { value: 'manual', icon: '🔍', title: 'Search by Job Title', desc: 'Enter any role and we search all platforms' },
            ].map(({ value, icon, title, desc }) => {
              const active = searchMode === value
              return (
                <button key={value} onClick={() => { setSearchMode(value); setError(null) }} style={{
                  padding: '18px 20px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  border: active ? '2px solid var(--indigo)' : '2px solid var(--border-light)',
                  background: active ? 'var(--indigo-soft)' : '#fff',
                  boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none',
                  transition: 'all 200ms',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: active ? 'var(--indigo)' : 'var(--text-dark)', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
                </button>
              )
            })}
          </div>

          {/* Manual query input */}
          {searchMode === 'manual' && (
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                value={manualQuery}
                onChange={e => setManualQuery(e.target.value)}
                placeholder="e.g. AI Engineer, Full Stack Developer, LLM Engineer"
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                  border: '2px solid var(--border-medium)', background: '#fff', color: 'var(--text-dark)',
                  outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 200ms, box-shadow 200ms',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--indigo)'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Upload zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--indigo)' : file ? 'var(--indigo)' : 'var(--border-medium)'}`,
            borderRadius: 20, padding: '36px 32px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 200ms',
            background: dragging ? 'var(--indigo-soft)' : '#fff',
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-soft)', border: '2px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={26} color="var(--green)" strokeWidth={1.5} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>{file.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, boxShadow: dragging ? '0 0 0 8px rgba(99,102,241,0.15)' : 'none', transition: 'box-shadow 200ms' }}>
                <UploadCloud size={28} color="#fff" strokeWidth={1.5} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-dark)' }}>Drop your resume here</p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>or click to browse · PDF only · Max 10MB</p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--red-soft)', border: '1px solid var(--red-border)', borderRadius: 10 }}>
            <AlertCircle size={16} color="var(--red)" strokeWidth={1.5} />
            <span style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {file && (
          <button onClick={handleAnalyze} style={{
            width: '100%', height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'transform 100ms, box-shadow 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            Analyze Resume →
          </button>
        )}

        {/* Past sessions */}
        {pastResumes.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Recent Sessions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pastResumes.map((r, i) => {
                const avatarColors = ['#6366f1','#ec4899','#f97316','#22c55e','#3b82f6']
                const color = avatarColors[i % avatarColors.length]
                const initials = (r.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <button key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, background: '#fff',
                    border: '1px solid var(--border-light)', cursor: 'pointer',
                    transition: 'box-shadow 150ms', textAlign: 'left',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  data-resume-id={r.id}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || 'Unknown'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || r.filename}</p>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-disabled)', flexShrink: 0 }}>→</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
