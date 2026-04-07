import client from './client'

export async function getExpenses(sessionId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/expenses`)
  return res.data
}

export async function getExpense(sessionId, expenseId) {
  const res = await client.get(`/api/fiscal-sessions/${sessionId}/expenses/${expenseId}`)
  return res.data
}

export async function createExpense(sessionId, data) {
  const res = await client.post(`/api/fiscal-sessions/${sessionId}/expenses`, data)
  return res.data
}

export async function updateExpense(sessionId, expenseId, data) {
  const res = await client.put(`/api/fiscal-sessions/${sessionId}/expenses/${expenseId}`, data)
  return res.data
}

export async function deleteExpense(sessionId, expenseId) {
  const res = await client.delete(`/api/fiscal-sessions/${sessionId}/expenses/${expenseId}`)
  return res.data
}
