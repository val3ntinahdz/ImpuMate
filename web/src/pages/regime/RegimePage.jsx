import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { getIncomeSources } from '../../api/incomeSources'
import useSessionStore from '../../store/useSessionStore'

// S-08: If no income sources → welcome screen; if sources exist → redirect to S-09
export default function RegimePage() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIncomeSources(sessionId)
      .then(sources => {
        if (sources && sources.length > 0) {
          navigate('/app/regime/sources', { replace: true })
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [sessionId, navigate])

  if (loading) return <LoadingSpinner message="Verificando fuentes de ingreso…" />

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="w-20 h-20 bg-surface-m1 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary mb-3">Módulo 1 — Régimen Fiscal</h1>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          Cuéntanos cómo obtienes tus ingresos. Agrega cada fuente por separado para que podamos
          identificar tus obligaciones fiscales.
        </p>
        <button
          onClick={() => navigate('/app/regime/sources/new')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-accent font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar mi primera fuente de ingreso
        </button>
      </div>
    </AppLayout>
  )
}
