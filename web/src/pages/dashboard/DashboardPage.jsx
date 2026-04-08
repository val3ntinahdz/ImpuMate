import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import StatusBadge from '../../components/ui/StatusBadge'
import { getSession } from '../../api/sessions'
import { getRegimeObligations } from '../../api/regime'
import { getDeductionsSummary } from '../../api/deductions'
import { getLatestBuffer } from '../../api/taxBuffer'
import useSessionStore from '../../store/useSessionStore'
import useAuthStore from '../../store/useAuthStore'
import { formatMXN, OBLIGATION_LABELS } from '../../utils/format'

function ModuleCard({ title, icon, color, children, cta, onCta, ctaSecondary, onCtaSecondary }) {
  return (
    <div className={`rounded-2xl p-5 border ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="mb-4">{children}</div>
      {cta && (
        <div className="flex gap-2">
          <PrimaryButton label={cta} onClick={onCta} className="flex-1 text-xs px-3 py-2" />
          {ctaSecondary && (
            <SecondaryButton label={ctaSecondary} onClick={onCtaSecondary} className="text-xs px-3 py-2" />
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { sessionId, exerciseYear } = useSessionStore()
  const { nombreCompleto } = useAuthStore()

  const [sessionData, setSessionData] = useState(null)
  const [obligations, setObligations] = useState(null)
  const [summary, setSummary] = useState(null)
  const [buffer, setBuffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getSession(sessionId).catch(() => null),
      getRegimeObligations(sessionId).catch(() => null),
      getDeductionsSummary(sessionId).catch(() => null),
      getLatestBuffer(sessionId).catch(() => null),
    ])
      .then(([sess, obls, sum, buf]) => {
        setSessionData(sess)
        setObligations(obls)
        setSummary(sum)
        setBuffer(buf)
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar el dashboard.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <LoadingSpinner message="Cargando tu dashboard…" />

  const hasRegime = obligations?.obligations?.length > 0
  const hasExpenses = (summary?.approvedCount || 0) + (summary?.rejectedCount || 0) > 0
  const hasBuffer = buffer?.recommendedMonthlyBuffer !== undefined

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          Hola{nombreCompleto ? `, ${nombreCompleto.split(' ')[0]}` : ''}
        </h1>
        <p className="text-text-secondary text-sm mt-1">Ejercicio fiscal {exerciseYear} · {sessionData?.bufferHorizonMonths || 3} meses de horizonte</p>
      </div>

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      {/* First-time guide banner */}
      {!hasRegime && (
        <div className="mb-5">
          <AlertBanner
            type="info"
            message="Empieza desde Perfil → Fuentes de ingreso para identificar tu régimen fiscal. Esto determina qué puedes deducir y cuánto debes pagar."
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {/* Module 1 — Régimen */}
        <ModuleCard
          title="Módulo 1 — Régimen"
          icon="🏛️"
          color="border-green-200 bg-surface-m1"
          cta={hasRegime ? 'Ver resultado' : 'Empezar'}
          onCta={() => navigate(hasRegime ? '/app/profile?tab=regime' : '/app/profile?tab=sources')}
          ctaSecondary={hasRegime ? 'Corregir fuentes' : null}
          onCtaSecondary={() => navigate('/app/profile?tab=sources')}
        >
          {hasRegime ? (
            <div>
              <p className="text-sm text-text-secondary mb-2">
                {obligations.obligations.length} obligación{obligations.obligations.length !== 1 ? 'es' : ''} activa{obligations.obligations.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1">
                {obligations.obligations.map(obl => (
                  <StatusBadge
                    key={obl}
                    status={obl.includes('RESICO') ? 'RESICO' : 'INFO'}
                    label={OBLIGATION_LABELS[obl] || obl}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Aún no identificaste tu régimen fiscal.</p>
          )}
        </ModuleCard>

        {/* Module 2 — Deducibles */}
        <ModuleCard
          title="Módulo 2 — Deducibles"
          icon="🧾"
          color="border-orange-200 bg-surface-m2"
          cta={hasExpenses ? 'Ver gastos' : 'Agregar gasto'}
          onCta={() => navigate(hasExpenses ? '/app/expenses' : '/app/expenses/new')}
          ctaSecondary={hasExpenses ? 'Ver resumen' : null}
          onCtaSecondary={() => navigate('/app/expenses/summary')}
        >
          {hasExpenses && summary ? (
            <div>
              <p className="text-lg font-bold text-primary">{formatMXN(summary.totalDeductiblesMxn)}</p>
              <p className="text-xs text-text-secondary mt-0.5">total deducible</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-status-success font-semibold">{summary.approvedCount} aprobados</span>
                <span className="text-status-error font-semibold">{summary.rejectedCount} rechazados</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Sin gastos registrados todavía.</p>
          )}
        </ModuleCard>

        {/* Module 3 — Buffer */}
        <ModuleCard
          title="Módulo 3 — Buffer"
          icon="💰"
          color="border-indigo-200 bg-surface-m3"
          cta={hasBuffer ? 'Ver resultado' : 'Calcular'}
          onCta={() => navigate(hasBuffer ? '/app/buffer/result' : '/app/buffer')}
          ctaSecondary={hasBuffer ? 'Recalcular' : null}
          onCtaSecondary={() => navigate('/app/buffer')}
        >
          {hasBuffer ? (
            <div>
              <p className="text-2xl font-bold text-secondary">{formatMXN(buffer.recommendedMonthlyBuffer)}</p>
              <p className="text-xs text-text-secondary mt-1">a apartar cada mes</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Calcula cuánto debes apartar cada mes.</p>
          )}
        </ModuleCard>
      </div>
    </AppLayout>
  )
}
