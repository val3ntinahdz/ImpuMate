import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import BigNumberCard from '../../components/ui/BigNumberCard'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import SectionDivider from '../../components/ui/SectionDivider'
import { calculateTaxBuffer, getLatestBuffer } from '../../api/taxBuffer'
import useSessionStore from '../../store/useSessionStore'
import { formatMXN, OBLIGATION_LABELS } from '../../utils/format'

function AmountRow({ label, amount, isCredit = false, isBold = false, color }) {
  return (
    <div className={`flex justify-between items-center py-2 ${isBold ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${color || 'text-text-primary'}`}>{label}</span>
      <span className={`text-sm font-semibold ${isCredit ? 'text-status-success' : color || 'text-text-primary'}`}>
        {isCredit ? '− ' : ''}{formatMXN(Math.abs(amount || 0))}
      </span>
    </div>
  )
}

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-surface-gray hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-text-primary">{title}</span>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

export default function BufferResultPage() {
  const navigate = useNavigate()
  const { sessionId, exerciseYear, bufferHorizonMonths } = useSessionStore()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState(null)

  const load = (forceRecalc = false) => {
    setLoading(true)
    const fetcher = forceRecalc ? calculateTaxBuffer(sessionId) : getLatestBuffer(sessionId)
    Promise.resolve(fetcher)
      .then(data => setResult(data))
      .catch(err => {
        // If no latest, try calculating
        if (!forceRecalc) {
          return calculateTaxBuffer(sessionId).then(data => setResult(data))
        }
        setError(err.response?.data?.error || 'Error al obtener el resultado del buffer.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { 
    load() 
  }, [sessionId])

  const handleRecalculate = async () => {
    setRecalculating(true)
    setError(null)
    try {
      const data = await calculateTaxBuffer(sessionId)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al recalcular.')
    } finally {
      setRecalculating(false)
    }
  }

  if (loading) return <LoadingSpinner message="Calculando tu fondo para impuestos…" />

  if (error && !result) {
    return (
      <AppLayout>
        <PageHeader title="Fondo para Impuestos" />
        <AlertBanner type="error" message={error} />
        <div className="mt-4 flex gap-3">
          <PrimaryButton label="Reintentar" onClick={() => load(true)} />
          <SecondaryButton label="Configurar fondo" onClick={() => navigate('/app/buffer')} />
        </div>
      </AppLayout>
    )
  }

  const isZero = result?.recommendedMonthlyBuffer === 0
  console.log("RESULT MONTLY INCOME == ", result);

  return (
    <>
      <PageHeader
        title="Fondo para Impuestos"
        subtitle={`Ejercicio ${exerciseYear || ''}`}
        breadcrumb={[{ label: 'Fondo para Impuestos', href: '/app/buffer' }, { label: 'Resultado' }]}
      />

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      {/* THE main card ⭐ */}
      <div className="mb-6">
        <BigNumberCard
          amount={result?.dueTaxesMonthly + result?.dueIVA}
          label="Debes apartar cada mes"
          sublabel={`Para cubrir tus impuestos del ejercicio ${exerciseYear || ''}`}
          bgColor="bg-primary"
          textColor="text-white"
        />

      </div>

      {/* Warnings */}
      {result?.warnings?.length > 0 && (
        <div className="space-y-2 mb-5">
          {result.warnings.map((w, i) => (
            <AlertBanner key={i} type="warning" message={w} />
          ))}
        </div>
      )}

      {/* Deducciones breakdown */}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-text-primary mb-3">Deducciones autorizadas</h2>
        <div className="divide-y divide-gray-50">
          <AmountRow 
            label={`Deducciones personales aprobadas:`}
            amount={result.annualContext.totalApprovedPersonalDeductiblesMXN}
          />
          <AmountRow 
            label={`Deducciones de actividad aprobadas:`}
            amount={result.annualContext.totalApprovedActivityDeductiblesMXN}
          />
        </div>
     </div> 

      {/* ISR breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-text-primary mb-3">Desglose ISR</h2>
        <div className="divide-y divide-gray-50">

          { 
            result.monthlyIncomeSources.map(income => {
              return (
                <AmountRow 
                  key={123}
                  label={`Sueldo mensual: ${income.obligationType}`}
                  amount={income.grossMonthlyAmountMXN}
                />
              )
            })
          }

          {
            Object.entries(result.monthlyISRperIncome).map(i => {
              return (
                <AmountRow 
                  label={`ISR mensual retenido: ${i[0]}`}
                  amount={i[1]}
                />
              )
            })
          }

          {
            Object.entries(result.annualWithheldISRperIncome).map(i => {
              return (
                <AmountRow 
                  label={`ISR anual retenido: ${i[0]}`}
                  amount={i[1]}
                />
              )
            })
          }
          
          <AmountRow 
            label={"ISR anual final (considerando deducciones):"}
            amount={result.annualISR}
          />

          <AmountRow 
            label={"Pronóstico anual de impuestos excedentes (a pagar en declaración anual): "}
            amount={result.dueTaxes}
            className="text-red-50 font-bold italic"
          />

          <AmountRow
            label={"Reserva mensual sugerida para pago de ISR: "}
            amount={result.dueTaxesMonthly}
            color="text-red-600"
          />
        </div>
      </div>

      {/* IVA breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-text-primary mb-3">Desglose IVA</h2>
        <div className="divide-y divide-gray-50">
          <AmountRow label="IVA trasladado" amount={result?.IVA} />
          <AmountRow label="IVA retenido por cliente" amount={result?.withheldIVA}/>
          <AmountRow label="Pronóstico de IVA por pagar" amount={result?.dueIVA} color="text-red-600" />
        </div>
      </div>

      {/* Collapsible: How was this calculated */}
      {result?.reasoning?.length > 0 && (
        <div className="mb-4">
          <CollapsibleSection title="¿Cómo se calculó este número?">
            <ol className="space-y-3">
              {result.reasoning.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 bg-surface-m3 text-secondary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-text-secondary leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CollapsibleSection>
        </div>
      )}

      {/* Missing data */}
      {result?.missingData?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {result.missingData.map((d, i) => (
            <span key={i} className="text-xs bg-blue-50 text-status-info border border-blue-200 px-3 py-1 rounded-full">{d}</span>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {result?.disclaimer && (
        <p className="text-xs text-text-secondary italic text-center mb-6 px-4">{result.disclaimer}</p>
      )}

      <SectionDivider />

      <div className="flex flex-col sm:flex-row gap-3">
        <PrimaryButton
          label={recalculating ? 'Recalculando…' : 'Recalcular'}
          onClick={handleRecalculate}
          loading={recalculating}
        />
        <SecondaryButton label="Agregar más gastos" onClick={() => navigate('/app/expenses/new')} />
        <SecondaryButton label="Volver al dashboard" onClick={() => navigate('/app/dashboard')} />
      </div>
    </>
  )
}
