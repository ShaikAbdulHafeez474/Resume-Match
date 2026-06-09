import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

// Attach Clerk token to every request automatically
api.interceptors.request.use(async (config) => {
  try {
    const token = await window.Clerk?.session?.getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch (e) {}
  return config
})

// Detect upgrade-required responses and surface them via a custom DOM event
api.interceptors.response.use(
  (response) => {
    if (response.data?.upgrade === true) {
      window.dispatchEvent(new CustomEvent('show-upgrade-modal', {
        detail: { feature: response.data.feature || 'this feature' }
      }))
    }
    return response
  },
  (error) => {
    if (error.response?.data?.upgrade === true) {
      window.dispatchEvent(new CustomEvent('show-upgrade-modal', {
        detail: { feature: error.response.data.feature || 'this feature' }
      }))
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const syncUser = (email, name) => api.post('/auth/sync', { email, name })
export const getMe    = ()            => api.get('/auth/me')

// ── Resume ────────────────────────────────────────────────────────────────
export const uploadResume = (formData, onUploadProgress) =>
  api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    timeout: 300000,
  })

export const getActiveResume  = () => api.get('/resume/me')
export const getResumeHistory = () => api.get('/resume/history')

// Tailor resume — analyze JD vs resume
export const analyzeJobResume = (jobId, jdText) =>
  api.post(`/resume/analyze-job/${jobId}`, { jdText }, { timeout: 120000 })

// Save tailoring results
export const saveJobTailoring = (jobId, data) =>
  api.post(`/resume/save-tailoring/${jobId}`, data)

// Get saved tailoring for a job
export const getJobTailoring = (jobId) =>
  api.get(`/resume/tailoring/${jobId}`)

// ── Jobs ──────────────────────────────────────────────────────────────────
export const fetchJobs = (searchMode = 'resume', manualQuery = '') =>
  api.post('/jobs/fetch', { searchMode, manualQuery }, { timeout: 300000 })

export const getJobs         = (filters = {}) => api.get('/jobs', { params: filters })
export const getJobById      = (id)            => api.get(`/jobs/${id}`)
export const getAppliedJobs  = ()              => api.get('/jobs/applied')
export const getSkippedJobs  = ()              => api.get('/jobs/skipped')
export const getStats        = ()              => api.get('/jobs/stats')
export const getFetchHistory = ()              => api.get('/jobs/fetch-history')

export const applyJob          = (id)           => api.patch(`/jobs/${id}/apply`)
export const skipJob           = (id)           => api.patch(`/jobs/${id}/skip`)
export const skipJobWithReason = (id, reason)   => api.patch(`/jobs/${id}/skip`, { reason })
export const unskipJob         = (id)           => api.patch(`/jobs/${id}/unskip`)
export const scoreJob          = (id)           => api.patch(`/jobs/${id}/score`)
export const saveJob           = (id)           => api.post(`/jobs/${id}/save`)
export const restoreJob        = (id)           => api.post(`/jobs/${id}/restore`)
export const getJobsByFilter   = (filter)       => api.get('/jobs', { params: filter ? { filter } : {} })
export const getSavedOptimizations = ()         => api.get('/jobs/saved-optimizations')

// ── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboardStats  = ()     => api.get('/dashboard/stats')
export const getRecentActivity = (all = false) =>
  api.get(`/dashboard/recent-activity${all ? '?all=true' : ''}`)
export const getAtsTrend        = ()     => api.get('/dashboard/ats-trend')
export const getTopSkills       = ()     => api.get('/dashboard/top-skills')

// ── Optimizations ─────────────────────────────────────────────────────────
export const getOptimizations      = (search) => api.get(`/optimizations${search ? `?search=${encodeURIComponent(search)}` : ''}`)
export const getOptimizationDetail = (id)     => api.get(`/optimizations/${id}`)

// ── Resume Coach ──────────────────────────────────────────────────────────
export const getResumeStatus = ()              => api.get('/resume/status')
export const refreshResumeAnalysis = ()      => api.post('/resume/refresh-analysis', {}, { timeout: 120000 })
export const chatWithCoach = ({ message, history = [], jobId = null, context = 'resume' }) =>
  api.post('/resume/coach', { message, history, jobId, context }, { timeout: 90000 })

// ── Payment ───────────────────────────────────────────────────────────────
export const createOrder     = (plan)       => api.post('/payment/create-order', { plan })
export const verifyPayment   = (data)       => api.post('/payment/verify', data)
export const getPaymentStatus = ()          => api.get('/payment/status')

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminGetUsers   = (search, key) => api.get('/admin/users', { params: { search }, headers: { 'x-admin-key': key } })
export const adminUpdatePlan = (id, plan, days, key) => api.patch(`/admin/users/${id}/plan`, { plan, days }, { headers: { 'x-admin-key': key } })
export const adminRemovePlan = (id, key)     => api.delete(`/admin/users/${id}/plan`, { headers: { 'x-admin-key': key } })
export const adminGetStats   = (key)         => api.get('/admin/stats', { headers: { 'x-admin-key': key } })