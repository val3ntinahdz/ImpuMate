import client from './client'

export async function calculateTaxBuffer(sessionId) {
  const res = await client.post(`/api/fiscal-sessions/${sessionId}/tax-buffer/calculate`)
  return res.data
}

export async function getLatestBuffer(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/tax-buffer/latest`)
  return res.data
}
