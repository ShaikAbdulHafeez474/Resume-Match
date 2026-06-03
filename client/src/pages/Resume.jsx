import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Send, Sparkles, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'
import ChatBubble, { ChatTypingIndicator, ResumeAttachedChip } from '../components/ChatBubble'
import { getResumeStatus, uploadResume, chatWithCoach } from '../lib/api'

// ── Circular progress ──────────────────────────────────────────────────────
function CircleProgress({ pct, size = 80, stroke = 6, color = '#6366f1' }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

import { computeResumeHealth, HEALTH_SECTIONS, isSectionFilled, healthColor } from '../lib/resumeHealth'

// ── Upload Modal ───────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }) {
  const [file, setFile]   = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      const res = await uploadResume(fd)
      toast.success(res.data.isExisting ? 'Resume recognized!' : 'Resume analyzed!')
      onSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)' }}>Upload Resume</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.background = 'var(--indigo-soft)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.background = '#fff' }}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); else toast.error('Only PDF allowed'); e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.background = '#fff' }}
          style={{ border: '2px dashed var(--border-medium)', borderRadius: 16, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: file ? 'var(--green-soft)' : '#fff', borderColor: file ? 'var(--green)' : 'var(--border-medium)', marginBottom: 16 }}>
          <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px', background: file ? 'var(--green-soft)' : 'var(--indigo-soft)', border: `1px solid ${file ? 'var(--green-border)' : 'var(--indigo-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={22} color={file ? '#15803d' : 'var(--indigo)'} />
          </div>
          {file ? <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>✓ {file.name}</p> : <><p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Drop your resume here</p><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>or click to browse · PDF only · Max 10MB</p></>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#fff', border: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Cancel</button>
          <button onClick={handleUpload} disabled={!file || loading} style={{ flex: 2, padding: '11px 0', borderRadius: 10, background: (!file || loading) ? 'var(--border-light)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: (!file || loading) ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: (!file || loading) ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing...</> : <><Sparkles size={15} /> Analyze Resume</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Resume Page ───────────────────────────────────────────────────────
export default function Resume() {
  const [resume,       setResume]       = useState(null)
  const [history,      setHistory]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('coach')
  const [showUpload,   setShowUpload]   = useState(false)
  const [messages,     setMessages]     = useState([
    { role: 'assistant', text: "Hi! I'm your AI Resume Coach. I can help you improve your resume, identify skill gaps, and optimize for better ATS scores." }
  ])
  const [chatInput,    setChatInput]    = useState('')
  const [chatLoading,  setChatLoading]  = useState(false)
  const chatEndRef = useRef()

  useEffect(() => { loadResume() }, [])

  useEffect(() => {
    if (!resume) return
    const filename = resume.filename || 'resume.pdf'
    setMessages([{
      role: 'assistant',
      text: `## AI Resume Coach\n✅ Your **complete uploaded resume** is attached to this chat\n📄 **${filename}** — full document, every section and bullet point\n💡 Ask about any part of your resume: projects, experience, skills, summary\n→ Try: "Review my project bullet points for ATS improvements"`,
    }])
  }, [resume?.id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadResume() {
    setLoading(true)
    try {
      const res = await getResumeStatus()
      setResume(res.data.resume || null)
      setHistory(res.data.history || [])
    } catch {
      setResume(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (data) => {
    loadResume()
    setShowUpload(false)
    toast.success('Resume updated!')
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    if (!resume) {
      toast.error('Upload your resume first to use the AI coach.')
      return
    }

    const msg = chatInput.trim()
    setChatInput('')
    const priorMessages = messages.filter((m, i) => !(i === 0 && m.role === 'assistant'))
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await chatWithCoach({
        message: msg,
        history: priorMessages,
        context: 'resume',
      })
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }])
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Sorry, something went wrong. Try again.'
      toast.error(errorMsg)
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }])
    } finally {
      setChatLoading(false)
    }
  }

  const analysis  = resume?.analysis || {}
  const healthPct = resume ? computeResumeHealth(analysis) : null

  const TABS = [
    { id: 'coach',   label: 'AI Resume Coach' },
    { id: 'health',  label: 'Resume Health'   },
    { id: 'versions',label: 'Versions'        },
  ]

  const SUGGESTIONS = [
    'Review my resume', 'What skills should I learn?',
    'How can I increase my ATS score?', 'Improve my summary',
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>

      {/* ── LEFT — Resume Preview ── */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--border-light)', background: '#fff', overflowY: 'auto', padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Your Resume</div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 16, background: 'var(--bg-soft)', borderRadius: 8 }} />)}
          </div>
        ) : !resume ? (
          <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--indigo-soft)', border: '2px dashed var(--indigo-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} strokeWidth={1.5} color="var(--indigo)" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', maxWidth: 200, textAlign: 'center' }}>No resume uploaded yet. Upload your PDF to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name + title */}
            <div style={{ padding: '14px 16px', background: 'var(--indigo-soft)', borderRadius: 12, border: '1px solid var(--indigo-border)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-dark)' }}>{analysis.name || 'Your Name'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{analysis.current_title || 'Professional'}</div>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Summary</div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.65, margin: 0 }}>{analysis.summary}</p>
              </div>
            )}

            {/* Skills */}
            {analysis.core_skills?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {analysis.core_skills.slice(0, 8).map((s, i) => (
                    <span key={i} style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {analysis.education && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Education</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{analysis.education.degree} in {analysis.education.field}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{analysis.education.institution} · {analysis.education.graduation_year}</div>
              </div>
            )}

            {/* Upload date */}
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>
              Uploaded {resume.created_at ? new Date(resume.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>

            {/* Health meter */}
            {healthPct !== null && (
              <div style={{ padding: '12px 14px', background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Resume Health</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: healthColor(healthPct) }}>{healthPct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${healthPct}%`, background: healthColor(healthPct), borderRadius: 999 }} />
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setShowUpload(true)}
          style={{ marginTop: 20, width: '100%', padding: '11px 0', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Upload size={14} /> {resume ? 'Update Resume' : 'Upload Resume'}
        </button>
      </div>

      {/* ── RIGHT — Tabs ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: '#fff', padding: '0 20px', flexShrink: 0 }}>
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '14px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              fontSize: 13, fontWeight: activeTab === id ? 800 : 600,
              color: activeTab === id ? 'var(--indigo)' : 'var(--text-muted)',
              borderBottom: activeTab === id ? '2px solid var(--indigo)' : '2px solid transparent',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* AI Resume Coach */}
        {activeTab === 'coach' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resume && (
                <ResumeAttachedChip filename={resume.filename || 'resume.pdf'} />
              )}
              {messages.length <= 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {SUGGESTIONS.map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <ChatBubble key={i} role={m.role} text={m.text} />
              ))}
              {chatLoading && <ChatTypingIndicator />}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', background: '#fff', display: 'flex', gap: 10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                placeholder="Ask your AI Resume Coach anything..."
                style={{ flex: 1, borderRadius: 10, border: '1px solid var(--border-medium)', padding: '12px 16px', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }} />
              <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}
                style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--indigo)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {/* Resume Health */}
        {activeTab === 'health' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!resume ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Upload a resume to see your health score.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <CircleProgress pct={healthPct || 0} color={healthColor(healthPct || 0)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: healthColor(healthPct || 0) }}>
                      {healthPct}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-dark)' }}>
                      {healthPct >= 70 ? 'Good' : healthPct >= 50 ? 'Fair' : 'Needs Work'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      {HEALTH_SECTIONS.filter(({ key }) => isSectionFilled(analysis, key)).length} of {HEALTH_SECTIONS.length} sections complete
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                      Based on your uploaded PDF analysis only. AI chat does not change this score.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {HEALTH_SECTIONS.map(({ key, label }) => {
                    const filled = isSectionFilled(analysis, key)
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10 }}>
                        {filled
                          ? <CheckCircle2 size={16} strokeWidth={2} color="#10b981" />
                          : <AlertCircle  size={16} strokeWidth={2} color="#f59e0b" />}
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: filled ? '#10b981' : '#f59e0b' }}>
                          {filled ? 'Complete' : 'Missing'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Versions */}
        {activeTab === 'versions' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No resume versions yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#fff', border: `1px solid ${r.is_active ? 'var(--indigo)' : 'var(--border-light)'}`, borderRadius: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>
                        {r.name || r.title || 'Resume'} {r.is_active && <span style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700, marginLeft: 6 }}>Current</span>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    {r.is_active && (
                      <button onClick={() => setShowUpload(true)}
                        style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Update
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />}
    </div>
  )
}
