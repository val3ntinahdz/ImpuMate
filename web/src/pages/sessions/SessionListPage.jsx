import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import PrimaryButton from '../../components/ui/PrimaryButton'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import { getSessions } from '../../api/sessions'
import useSessionStore from '../../store/useSessionStore'
import { formatDate, formatMXN } from '../../utils/format'

function SessionCard({ session, onSelect }) {
  return (
    <button
      onClick={() => onSelect(session)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-primary">{session.exerciseYear}</span>
        <span className="text-xs text-text-secondary">Creada {formatDate(session.createdAt)}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-surface-m3 text-secondary px-2 py-1 rounded-full font-medium">
          Horizonte: {session.bufferHorizonMonths} {session.bufferHorizonMonths === 1 ? 'mes' : 'meses'}
        </span>
        {session.isrAlreadyWithheldMxn > 0 && (
          <span className="bg-surface-m1 text-primary px-2 py-1 rounded-full font-medium">
            ISR retenido: {formatMXN(session.isrAlreadyWithheldMxn)}
          </span>
        )}
        {session.ivaAlreadyPaidMxn > 0 && (
          <span className="bg-surface-m2 text-orange-700 px-2 py-1 rounded-full font-medium">
            IVA pagado: {formatMXN(session.ivaAlreadyPaidMxn)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-text-secondary">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>Abrir sesión fiscal</span>
      </div>
    </button>
  )
}

export default function SessionListPage() {
  const navigate = useNavigate()
  const { setSession } = useSessionStore()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSessions()
      .then(data => setSessions(data || []))
      .catch(err => setError(err.response?.data?.error || 'Error al cargar las sesiones.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (session) => {
    setSession(session)
    navigate('/app/dashboard')
  }

  if (loading) return <LoadingSpinner message="Cargando sesiones fiscales…" />

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Sesiones Fiscales"
          subtitle="Cada sesión corresponde a un ejercicio fiscal (año)."
        />
        <PrimaryButton label="+ Nueva sesión" onClick={() => navigate('/sessions/new')} />
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {!error && sessions.length === 0 ? (
        <EmptyState
          title="Sin ejercicios registrados"
          subtitle="¡Empieza con 2026! Crea tu primera sesión fiscal para comenzar."
          ctaLabel="Crear sesión fiscal"
          onCta={() => navigate('/sessions/new')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map(s => (
            <SessionCard key={s.id} session={s} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
