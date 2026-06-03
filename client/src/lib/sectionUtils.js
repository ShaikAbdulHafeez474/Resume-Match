/**
 * Safely convert any AI-returned section value to a renderable string.
 * Prevents React "Objects are not valid as a React child" crashes when the
 * model returns nested objects / arrays inside section fields.
 */
export function safeStr(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          // Experience / project object — render bullets if present, else key: value
          if (Array.isArray(item.bullets)) {
            const header = [item.title, item.company, item.name].filter(Boolean).join(' · ')
            return [header, ...item.bullets.map(b => `• ${b}`)].filter(Boolean).join('\n')
          }
          return Object.entries(item)
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            .join('\n')
        }
        return String(item)
      })
      .join('\n\n')
  }
  // Plain object (e.g. { "Career Horizon": "...", "Contest Remainder": "..." })
  return Object.entries(val)
    .map(([k, v]) => `${k}:\n${safeStr(v)}`)
    .join('\n\n')
}

/** Return a safe string[] from a keywords_added field that might be anything. */
export function safeKeywords(kws) {
  if (!kws) return []
  if (!Array.isArray(kws)) return []
  return kws.map(k => (typeof k === 'string' ? k : safeStr(k))).filter(Boolean)
}
