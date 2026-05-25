import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResumeUpload from '../components/ResumeUpload'
import { getResumes } from '../lib/api'

export default function Home() {
  const [resumes, setResumes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getResumes().then(r => setResumes(r.data.resumes || [])).catch(() => {})
  }, [])

  const handleResumeClick = (e) => {
    const btn = e.target.closest('[data-resume-id]')
    if (btn) navigate(`/results/${btn.dataset.resumeId}`)
  }

  return (
    <div style={{ height: 'calc(100vh - 72px)', overflow: 'hidden' }} onClick={handleResumeClick}>
      <ResumeUpload pastResumes={resumes} />
    </div>
  )
}
