import { CheckCircle2, AlertTriangle, Lightbulb, ArrowRight, Sparkles, FileText } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

function renderInline(text, keyPrefix = '') {
  if (!text) return null
  const parts = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let match
  let i = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`${keyPrefix}-t-${i++}`}>{text.slice(last, match.index)}</span>)
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b-${i++}`} style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${i++}`} style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85em',
          background: '#f1f5f9',
          color: '#475569',
          padding: '1px 6px',
          borderRadius: 4,
        }}>
          {token.slice(1, -1)}
        </code>
      )
    } else {
      parts.push(
        <em key={`${keyPrefix}-e-${i++}`} style={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </em>
      )
    }
    last = match.index + token.length
  }

  if (last < text.length) parts.push(<span key={`${keyPrefix}-t-${i++}`}>{text.slice(last)}</span>)
  return parts.length ? parts : text
}

function stripMarker(line) {
  return line
    .replace(/^[\s]*[✅✓✔⚠️❌💡→]\s*/, '')
    .replace(/^[\s]*\[[x ]\]\s*/i, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^>\s*/, '')
    .trim()
}

function getLineKind(line) {
  const t = line.trim()
  if (/^[✅✓✔]/.test(t) || /^\[x\]/i.test(t)) return 'check'
  if (/^[⚠️❌]/.test(t)) return 'warn'
  if (/^[💡]/.test(t)) return 'nudge'
  if (/^→/.test(t)) return 'action'
  if (/^>\s/.test(t)) return 'quote'
  if (/^[-*•]\s/.test(t)) return 'bullet'
  if (/^\d+\.\s/.test(t)) return 'numbered'
  return 'text'
}

const ICON_ROW = {
  check:  { Icon: CheckCircle2, color: '#16a34a' },
  warn:   { Icon: AlertTriangle, color: '#d97706' },
  action: { Icon: ArrowRight, color: '#6366f1' },
  bullet: { Icon: null, color: '#64748b' },
}

function MarkdownLine({ line, index, numberedIndex }) {
  const kind = getLineKind(line)
  const text = stripMarker(line)
  if (!text) return null

  if (kind === 'nudge') {
    return (
      <div key={index} style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '12px 14px', marginBottom: 8,
        background: '#f5f3ff', borderRadius: 10,
        border: '1px solid #ddd6fe',
      }}>
        <Lightbulb size={16} strokeWidth={2} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: '#3730a3', fontWeight: 500, fontFamily: FONT }}>
          {renderInline(text, `n-${index}`)}
        </div>
      </div>
    )
  }

  if (kind === 'quote') {
    return (
      <div key={index} style={{
        marginBottom: 10, paddingLeft: 14,
        borderLeft: '3px solid #cbd5e1',
        fontSize: 14.5, lineHeight: 1.7, color: '#64748b',
        fontStyle: 'italic', fontFamily: FONT,
      }}>
        {renderInline(text, `q-${index}`)}
      </div>
    )
  }

  const iconCfg = ICON_ROW[kind] || ICON_ROW.bullet
  const { Icon, color } = iconCfg

  return (
    <div key={index} style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      marginBottom: 8, paddingLeft: kind === 'numbered' ? 0 : 2,
    }}>
      {kind === 'numbered' ? (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, fontWeight: 700, color: '#6366f1',
          minWidth: 22, flexShrink: 0, marginTop: 2,
        }}>
          {numberedIndex}.
        </span>
      ) : Icon ? (
        <Icon size={16} strokeWidth={2.2} color={color} style={{ flexShrink: 0, marginTop: 3 }} />
      ) : (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#94a3b8', flexShrink: 0, marginTop: 9, marginLeft: 5,
        }} />
      )}
      <div style={{
        fontSize: 15, lineHeight: 1.75, color: 'var(--text-body)',
        fontFamily: FONT, fontWeight: 500, flex: 1,
      }}>
        {renderInline(text, `l-${index}`)}
      </div>
    </div>
  )
}

export function ChatMarkdown({ content, compact = false }) {
  if (!content) return null

  const lines = content.split('\n')
  const blocks = []
  let numberedCounter = 0

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      numberedCounter = 0
      return
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${idx}`} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '18px 0' }} />)
      numberedCounter = 0
      return
    }

    if (line.startsWith('## ')) {
      numberedCounter = 0
      blocks.push(
        <h2 key={`h2-${idx}`} style={{
          fontSize: compact ? 15 : 16,
          fontWeight: 700,
          color: 'var(--text-dark)',
          fontFamily: FONT,
          margin: blocks.length === 0 ? '0 0 12px' : '22px 0 12px',
          paddingBottom: 8,
          borderBottom: '1px solid #e2e8f0',
          letterSpacing: '-0.01em',
        }}>
          {line.slice(3)}
        </h2>
      )
      return
    }

    if (line.startsWith('### ')) {
      numberedCounter = 0
      blocks.push(
        <h3 key={`h3-${idx}`} style={{
          fontSize: compact ? 14 : 15,
          fontWeight: 700,
          color: '#475569',
          fontFamily: FONT,
          margin: '16px 0 10px',
        }}>
          {line.slice(4)}
        </h3>
      )
      return
    }

    const kind = getLineKind(line)
    if (kind === 'numbered') numberedCounter += 1
    else if (kind !== 'bullet' && kind !== 'check' && kind !== 'warn' && kind !== 'action' && kind !== 'nudge' && kind !== 'quote') {
      numberedCounter = 0
    }

    if (kind === 'text') {
      blocks.push(
        <p key={`p-${idx}`} style={{
          fontSize: 15, lineHeight: 1.75, color: 'var(--text-body)',
          fontFamily: FONT, fontWeight: 500,
          margin: '0 0 10px',
        }}>
          {renderInline(line, `p-${idx}`)}
        </p>
      )
      return
    }

    blocks.push(
      <MarkdownLine
        key={`line-${idx}`}
        line={line}
        index={idx}
        numberedIndex={kind === 'numbered' ? numberedCounter : null}
      />
    )
  })

  return <div style={{ fontFamily: FONT }}>{blocks}</div>
}

export default function ChatBubble({ role, text, compact = false }) {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: compact ? '88%' : '75%',
          padding: '12px 16px',
          borderRadius: '16px 16px 4px 16px',
          background: '#6366f1',
          color: '#fff',
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.65,
          fontFamily: FONT,
        }}>
          {text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, alignItems: 'flex-start', width: '100%' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Sparkles size={14} color="#fff" strokeWidth={2} />
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        padding: compact ? '14px 16px' : '16px 20px',
        borderRadius: '4px 16px 16px 16px',
        background: '#fff',
        border: '1px solid #e2e8f0',
      }}>
        <ChatMarkdown content={text} compact={compact} />
      </div>
    </div>
  )
}

export function ResumeAttachedChip({ filename = 'resume.pdf', compact = false }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 10,
      background: '#fff', border: '1px solid #e2e8f0',
      marginBottom: 12,
    }}>
      <FileText size={15} strokeWidth={2} color="#6366f1" />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', fontFamily: FONT }}>{filename}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#16a34a', fontFamily: FONT }}>Complete resume attached</div>
      </div>
    </div>
  )
}

export function ChatTypingIndicator({ compact = false }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={14} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ padding: '14px 18px', borderRadius: '4px 16px 16px 16px', background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
              animation: `bounce 1.2s ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
