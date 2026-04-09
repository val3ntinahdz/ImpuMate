import client from './client'

export async function register({ email, password, rfc, nombreCompleto }) {
  const res = await client.post('/api/auth/register', { email, password, rfc, nombreCompleto })
  return res.data
}

export async function login({ email, password }) {
  const res = await client.post('/api/auth/login', { email, password })
  return res.data
}

export async function logout() {
  const res = await client.post('/api/auth/logout')
  return res.data
}

export async function getProfile() {
  const res = await client.get('/api/profile')
  return res.data
}

export async function updateProfile(data) {
  const res = await client.put('/api/profile', data)
  return res.data
}

export async function getSatRegimes() {
  const res = await client.get('/api/profile/sat-regimes')
  return res.data
}

export async function updateSatRegimes(satRegimes) {
  const res = await client.put('/api/profile/sat-regimes', { satRegimes })
  return res.data
}

export async function getSatObligations() {
  const res = await client.get('/api/profile/sat-obligations')
  return res.data
}

export async function updateSatObligations(satObligations) {
  const res = await client.put('/api/profile/sat-obligations', { satObligations })
  return res.data
}
