import client from './client'

export async function getIncomeSources(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/income-sources`)
  return res.data
}

export async function createIncomeSource(sessionId, data) {
  const res = await client.post(`/api/fiscal-sessions/${sessionId}/income-sources`, data)
  return res.data
}

export async function updateIncomeSource(sessionId, sourceId, data) {
  const res = await client.put(`/api/fiscal-sessions/${sessionId}/income-sources/${sourceId}`, data)
  return res.data
}

export async function deleteIncomeSource(sessionId, sourceId) {
  const res = await client.delete(`/api/fiscal-sessions/${sessionId}/income-sources/${sourceId}`)
  return res.data
}
