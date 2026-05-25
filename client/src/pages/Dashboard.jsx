import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { RefreshCw, Upload, Search, X, Briefcase, ChevronDown, Clock, Sparkles } from 'lucide-react'
import JobCard from '../components/JobCard'
import JobCardSkeleton from '../components/JobCardSkeleton'
import StatBar from '../components/StatBar'
import FilterBar from '../components/FilterBar'
import ResumePanel from '../components/ResumePanel'
import EmptyState from '../components/EmptyState'
import {
  getJobs, getStats, getActiveResume,
  fetchJobs, uploadResume, getFetchHistory,
} from '../lib/api'

// ── Fetch Modal ──────────────────────────────────────────────────────────────
function FetchModal({ onClose, onFetch, hasResume }) {
  const [mode, setMode]   = useState(hasResume ? 'resume' : 'manual')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    if (mode === 'manual' && !query.trim()) {
      toast.error('Please enter a job title')
      return
    }
    setLoading(true)
    await onFetch(mode, query.trim())
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,14,26,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 32px',
        width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid var(--border-light)',
        animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2 }}>
              Fetch New Jobs
            </h2>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginTop: 3 }}>
              New jobs are added to your existing list
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', marginBottom: 10 }}>
            How should we search?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Resume match option */}
            <div
              onClick={() => hasResume && setMode('resume')}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: hasResume ? 'pointer' : 'not-allowed',
                border: `2px solid ${mode === 'resume' ? 'var(--indigo)' : 'var(--border-light)'}`,
                background: mode === 'resume' ? 'var(--indigo-soft)' : hasResume ? '#fff' : 'var(--bg-soft)',
                opacity: hasResume ? 1 : 0.5,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: mode === 'resume' ? 'var(--indigo)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} strokeWidth={2} color={mode === 'resume' ? '#fff' : 'var(--text-muted)'} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
                  Match from my resume
                  {!hasResume && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600,
                      background: 'var(--orange-soft)', color: 'var(--orange)',
                      border: '1px solid var(--orange-border)',
                      borderRadius: 999, padding: '2px 8px',
                    }}>
                      Upload resume first
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
                  AI reads your profile and finds best matches
                </div>
              </div>
            </div>

            {/* Manual search option */}
            <div
              onClick={() => setMode('manual')}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${mode === 'manual' ? 'var(--indigo)' : 'var(--border-light)'}`,
                background: mode === 'manual' ? 'var(--indigo-soft)' : '#fff',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: mode === 'manual' ? 'var(--indigo)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Search size={16} strokeWidth={2} color={mode === 'manual' ? '#fff' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
                  Search by job title
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
                  Enter any role and we search across platforms
                </div>
                {mode === 'manual' && (
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleFetch() }}
                    placeholder="e.g. AI Engineer, Full Stack Developer..."
                    style={{
                      marginTop: 10, width: '100%',
                      padding: '10px 14px', borderRadius: 10,
                      border: '1px solid var(--border-medium)',
                      background: '#fff', fontSize: 14, fontWeight: 500,
                      color: 'var(--text-dark)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      outline: 'none',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--indigo)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border-medium)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px 0', borderRadius: 10,
            background: '#fff', border: '1px solid var(--border-medium)',
            color: 'var(--text-muted)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Cancel
          </button>
          <button
            onClick={handleFetch}
            disabled={loading}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              background: loading ? 'var(--border-light)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 14, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Fetching...</>
            ) : (
              <><RefreshCw size={15} strokeWidth={2.5} /> Fetch Jobs</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resume Upload Modal ──────────────────────────────────────────────────────
function ResumeUploadModal({ onClose, onSuccess }) {
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      const res = await uploadResume(formData)
      toast.success(res.data.isExisting ? 'Resume recognized — profile restored!' : 'Resume analyzed successfully!')
      onSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,14,26,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 32px',
        width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid var(--border-light)',
        animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)' }}>
            Upload Resume
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.background = 'var(--indigo-soft)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.background = '#fff' }}
          onDrop={e => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f?.type === 'application/pdf') setFile(f)
            else toast.error('Only PDF files allowed')
            e.currentTarget.style.borderColor = 'var(--border-medium)'
            e.currentTarget.style.background = '#fff'
          }}
          style={{
            border: '2px dashed var(--border-medium)', borderRadius: 16,
            padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
            background: file ? 'var(--green-soft)' : '#fff',
            borderColor: file ? 'var(--green)' : 'var(--border-medium)',
            marginBottom: 16,
          }}
        >
          <input
            ref={inputRef} type="file" accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0] || null)}
          />
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
            background: file ? 'var(--green-soft)' : 'var(--indigo-soft)',
            border: `1px solid ${file ? 'var(--green-border)' : 'var(--indigo-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={22} strokeWidth={2} color={file ? '#15803d' : 'var(--indigo)'} />
          </div>
          {file ? (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>✓ {file.name}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Click to change</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Drop your resume here</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>or click to browse · PDF only · Max 10MB</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px 0', borderRadius: 10,
            background: '#fff', border: '1px solid var(--border-medium)',
            color: 'var(--text-muted)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              background: (!file || loading) ? 'var(--border-light)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: (!file || loading) ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 14, border: 'none',
              cursor: (!file || loading) ? 'not-allowed' : 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (!file || loading) ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing...</>
            ) : (
              <><Sparkles size={15} strokeWidth={2.5} /> Analyze Resume</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useUser()

  const [jobs, setJobs]             = useState([])
  const [stats, setStats]           = useState(null)
  const [resume, setResume]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [showFetchModal, setShowFetchModal]   = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [lastFetch, setLastFetch]   = useState(null)

  const [filters, setFilters] = useState({
    minScore: 0, remote: false, source: 'all', sort: 'score',
  })

  // Initial load
  useEffect(() => {
    loadAll()
  }, [])

  // Reload jobs when filters change
  useEffect(() => {
    loadJobs()
  }, [filters])

  async function loadAll() {
    setLoading(true)
    try {
      const [jobsRes, statsRes, resumeRes] = await Promise.all([
        getJobs(filters),
        getStats(),
        getActiveResume(),
      ])
      setJobs(jobsRes.data.jobs || [])
      setStats(statsRes.data)
      setResume(resumeRes.data.resume || null)
      setLastFetch(statsRes.data?.last_fetch || null)
    } catch (err) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadJobs() {
    try {
      const params = {
        minScore: filters.minScore,
        sort: filters.sort,
      }
      if (filters.remote) params.remote = 'true'
      if (filters.source !== 'all') params.source = filters.source

      const res = await getJobs(params)
      setJobs(res.data.jobs || [])
    } catch (err) {
      // silent
    }
  }

  async function loadStats() {
    try {
      const res = await getStats()
      setStats(res.data)
      setLastFetch(res.data?.last_fetch || null)
    } catch (err) {
      // silent
    }
  }

  const handleFetch = async (searchMode, manualQuery) => {
    setFetchLoading(true)
    try {
      const res = await fetchJobs(searchMode, manualQuery)
      const { newAdded, totalScraped, skipped } = res.data

      if (newAdded > 0) {
        toast.success(`✓ ${newAdded} new jobs added! (${skipped} already in your list)`)
        await loadAll()
      } else {
        toast(`No new jobs found. All ${totalScraped} scraped jobs are already in your list.`)
      }
      setShowFetchModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fetch failed')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleResumeUploadSuccess = (data) => {
    setResume({ analysis: data.analysis, id: data.resumeId })
    setShowUploadModal(false)
    // Offer to fetch jobs immediately
    toast.success('Resume ready! Click "Fetch New Jobs" to find matches.')
  }

  const handleRemoveJob = (jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
    loadStats()
  }

  // Empty state — no jobs at all
  const isEmpty = !loading && jobs.length === 0 && stats?.total === 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 72px)', overflow: 'hidden',
    }}>
      <StatBar stats={stats} onFetchClick={() => setShowFetchModal(true)} fetchLoading={fetchLoading} />
      <FilterBar filters={filters} onChange={setFilters} total={jobs.length} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT COLUMN — Job list ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px 16px 24px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Last fetch info bar */}
          {lastFetch && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px',
              background: 'var(--bg-soft)',
              border: '1px solid var(--border-light)',
              borderRadius: 10, marginBottom: 2,
            }}>
              <Clock size={13} strokeWidth={2} color="var(--text-muted)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Last fetch: {new Date(lastFetch.fetched_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })} · {lastFetch.new_added} new jobs added
              </span>
              <button
                onClick={() => setShowFetchModal(true)}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 8,
                  background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)',
                  color: 'var(--indigo)', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <RefreshCw size={11} strokeWidth={2.5} />
                Fetch More
              </button>
            </div>
          )}

          {/* Empty — no jobs at all */}
          {isEmpty ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: 20, paddingTop: 40,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'var(--indigo-soft)',
                border: '2px solid var(--indigo-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Briefcase size={32} strokeWidth={1.5} color="var(--indigo)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 8 }}>
                  No jobs yet
                </h3>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', maxWidth: 320 }}>
                  {resume
                    ? 'Your resume is ready. Fetch jobs to see AI-powered matches.'
                    : 'Upload your resume for AI matching, or search by job title to get started.'
                  }
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {!resume && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '11px 22px', borderRadius: 12,
                      background: 'var(--bg-soft)', border: '1px solid var(--border-medium)',
                      color: 'var(--text-dark)', fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <Upload size={15} strokeWidth={2.5} /> Upload Resume
                  </button>
                )}
                <button
                  onClick={() => setShowFetchModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '11px 22px', borderRadius: 12,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    border: 'none', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  }}
                >
                  <RefreshCw size={15} strokeWidth={2.5} /> Fetch Jobs
                </button>
              </div>
            </div>
          ) : loading ? (
            Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)
          ) : jobs.length === 0 ? (
            <EmptyState type="filtered" onReset={() => setFilters({ minScore: 0, remote: false, source: 'all', sort: 'score' })} />
          ) : (
            jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                onRemove={handleRemoveJob}
                isManual={!job.resume_id}
              />
            ))
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <ResumePanel
          resume={resume}
          stats={stats}
          onUploadClick={() => setShowUploadModal(true)}
          onFetchClick={() => setShowFetchModal(true)}
          userName={user?.firstName || user?.fullName || ''}
        />
      </div>

      {/* Modals */}
      {showFetchModal && (
        <FetchModal
          hasResume={!!resume}
          onClose={() => setShowFetchModal(false)}
          onFetch={handleFetch}
        />
      )}
      {showUploadModal && (
        <ResumeUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleResumeUploadSuccess}
        />
      )}
    </div>
  )
}