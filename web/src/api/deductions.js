import client from './client'

export async function getDeductionCatalog(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/deduction-catalog`)
  return res.data
}

export async function getDeductionsSummary(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/deductions/summary`)
  return res.data
}
