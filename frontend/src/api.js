const API_BASE = 'https://crmbaseee.onrender.com'

async function safeJson(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { message: text || 'Unknown error' } }
}

async function j(method, url, body, token) {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  })
  const data = await safeJson(res)
  return { ok: res.ok, data }
}

export const apiRegister = (email, password, role, teamName) => j('POST', '/auth/register', { email, password, role, teamName }).then(r => { if (!r.ok) throw new Error(r.data?.message || 'Register error'); return r.data })
export const apiLogin = (email, password) => j('POST', '/auth/login', { email, password }).then(r => { if (!r.ok) throw new Error(r.data?.message || 'Login error'); return r.data })
export const apiGetLeads = (token) => j('GET', '/leads', null, token).then(r => r.data)
export const apiCreateLead = (token, lead) => j('POST', '/leads', lead, token)
export const apiSetStatus = (token, id, status, comment) => 
  j('POST', `/leads/${id}/status`, { status, comment }, token);
export const apiDeleteLead = (token, id) => j('DELETE', `/leads/${id}`, null, token)
export const apiGetAnalytics = (token) => j('GET', '/analytics', null, token).then(r => r.data)
export const apiMe = (token) => j('GET', '/me', null, token).then(r => r.data)
export const apiGetTeam = (token) => j('GET', '/team', null, token).then(r => r.data)
export const apiAddMember = (token, payload) => j('POST', '/team/members', payload, token)
export async function apiUploadBase(token, file, teamId) {
  const fd = new FormData()
  fd.append('basefile', file)
  if (teamId) fd.append('teamId', String(teamId))
  const res = await fetch(`${API_BASE}/team/upload-base`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  })
  const data = await safeJson(res)
  return { ok: res.ok, data }
}
export const apiUpgradeToLead = (token, teamName) => j('POST', '/team/upgrade-to-lead', { teamName }, token)
export const apiAddTeamLead = (token, payload) => j('POST', '/admin/team-leads', payload, token)
export const apiUpdateDeadline = (token, id, deadline) => j('PUT', `/leads/${id}/deadline`, { deadline }, token)
