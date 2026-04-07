import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear persisted stores directly via localStorage/sessionStorage to avoid circular imports
      try { localStorage.removeItem('impumate-auth') } catch {}
      try { sessionStorage.removeItem('impumate-session') } catch {}
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default client
