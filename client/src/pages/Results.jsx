import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getJobs, getResume, getStats } from '../lib/api'
import JobCard from '../components/JobCard'
import JobCardSkeleton from '../components/JobCardSkeleton'
import AnalysisPanel from '../components/AnalysisPanel'
import StatBar from '../components/StatBar'
import FilterBar from '../components/FilterBar'
import EmptyState from '../components/EmptyState'

export default function Results() {
  const { id } = useParams()
  const [jobs, setJobs]           = useState([])
  const [analysis, setAnalysis]   = useState(null)
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [filters, setFilters]     = useState({ minScore: 0, remote: false, source: 'all', sort: 'score' })
  const [searchMode, setSearchMode] = useState('resume')
  const [manualQuery, setManualQuery] = useState('')

  // Read search mode from localStorage (written by ResumeUpload on success)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`resumatch_mode_${id}`)
      if (stored) {
        const { searchMode: mode, manualQuery: query } = JSON.parse(stored)
        setSearchMode(mode || 'resume')
        setManualQuery(query || '')
      }
    } catch {}
  }, [id])

  useEffect(() => {
    Promise.all([getResume(id), getStats(id)])
      .then(([r, s]) => { setAnalysis(r.data.resume.analysis); setStats(s.data) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    setLoading(true)
    const params = { minScore: filters.minScore }
    if (filters.remote) params.remote = 'true'
    if (filters.source !== 'all') params.source = filters.source
    getJobs(id, params).then(r => {
      let data = r.data.jobs || []
      if (filters.sort === 'company') data = [...data].sort((a, b) => (a.company || '').localeCompare(b.company || ''))
      setJobs(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id, filters])

  const removeJob = (jobId) => setJobs(prev => prev.filter(j => j.id !== jobId))
  const isManual = searchMode === 'manual'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      <StatBar stats={stats} />
      <FilterBar filters={filters} onChange={setFilters} total={loading ? undefined : jobs.length} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Job list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Manual mode banner */}
          {isManual && manualQuery && (
            <div style={{
              background: 'var(--indigo-soft)',
              border: '1px solid var(--indigo-border)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--indigo)',
              marginBottom: 4,
            }}>
              Showing results for <strong>"{manualQuery}"</strong> · Resume matching disabled in manual mode
            </div>
          )}

          {loading
            ? Array.from({ length: 8 }).map((_, i) => <JobCardSkeleton key={i} />)
            : jobs.length === 0
              ? <EmptyState type="no-jobs" />
              : jobs.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    onRemove={removeJob}
                    isManual={isManual}
                  />
                ))
          }
        </div>

        {/* Right panel — 420px */}
        <div style={{ width: 420, flexShrink: 0, borderLeft: '1px solid var(--border-light)', background: '#fff', overflowY: 'auto', padding: 16 }}>
          <AnalysisPanel analysis={analysis} stats={stats} isManual={isManual} />
        </div>
      </div>
    </div>
  )
}
