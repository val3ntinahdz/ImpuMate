import { useState, useCallback } from 'react'

export default function useApi(apiFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn(...args)
      setData(result)
      return result
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Error inesperado'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFn])

  return { loading, error, data, execute }
}
