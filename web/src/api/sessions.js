import client from './client'

export async function getSessions() {
  const res = await client.get('/api/fiscal-sessions')
  return res.data
}

export async function getSession(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}`)
  return res.data
}

export async function createSession(data) {
  const res = await client.post('/api/fiscal-sessions', data)
  return res.data
}

export async function updateSession(sessionId, data) {
  const res = await client.put(`/api/fiscal-sessions/${sessionId}`, data)
  return res.data
}

export async function deleteSession(sessionId) {
  const res = await client.delete(`/api/fiscal-sessions/${sessionId}`)
  return res.data
}
