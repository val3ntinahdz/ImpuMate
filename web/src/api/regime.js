import client from './client'

export async function runRegime(sessionId, profile = {}) {
  const res = await client.post(`/api/fiscal-sessions/${sessionId}/regime/run`, { profile })
  return res.data
}

export async function selectRegime(sessionId, obligations) {
  const res = await client.post(`/api/fiscal-sessions/${sessionId}/regime/select`, { obligations })
  return res.data
}

export async function getRegimeResults(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/regime/results`)
  return res.data
}

export async function getRegimeObligations(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/regime/obligations`)
  return res.data
}
