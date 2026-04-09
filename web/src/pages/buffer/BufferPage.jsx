import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import SelectDropdown from '../../components/ui/SelectDropdown'
import MoneyInput from '../../components/ui/MoneyInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import SectionDivider from '../../components/ui/SectionDivider'
import { updateSession, getSession } from '../../api/sessions'
import { getDeductionsSummary } from '../../api/deductions'
import { getIncomeSources } from '../../api/incomeSources'
import { calculateTaxBuffer } from '../../api/taxBuffer'
import useSessionStore from '../../store/useSessionStore'
import BufferResultPage from './BufferResultPage'

export default function BufferPage() {
  const navigate = useNavigate()
  const { sessionId, setSession } = useSessionStore()
  const [sessionData, setSessionData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)
  const [resultKey, setResultKey] = useState(0)

  const [form, setForm] = useState({
    bufferHorizonMonths: '3',
    isrAlreadyWithheldMxn: '',
    ivaAlreadyPaidMxn: '',
  })

  useEffect(() => {
    Promise.all([
      getSession(sessionId),
      getDeductionsSummary(sessionId).catch(() => null),
      getIncomeSources(sessionId).catch(() => []),
    ])
      .then(([sess, sum, srcs]) => {
        setSessionData(sess)
        setSummary(sum)
        setSources(srcs || [])
        setForm({
          bufferHorizonMonths: String(sess.bufferHorizonMonths || 3),
          isrAlreadyWithheldMxn: sess.isrAlreadyWithheldMxn > 0 ? String(sess.isrAlreadyWithheldMxn) : '',
          ivaAlreadyPaidMxn: sess.ivaAlreadyPaidMxn > 0 ? String(sess.ivaAlreadyPaidMxn) : '',
        })
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar datos.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setError(null)
    try {
      // Update session params first
      const updated = await updateSession(sessionId, {
        bufferHorizonMonths: Number(form.bufferHorizonMonths),
        isrAlreadyWithheldMxn: Number(form.isrAlreadyWithheldMxn) || 0,
        ivaAlreadyPaidMxn: Number(form.ivaAlreadyPaidMxn) || 0,
      })
      setSession(updated)
      // Then calculate
      await calculateTaxBuffer(sessionId)
      setResultKey(k => k + 1)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al calcular el fondo.')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos…" />

  const noDeductions = !summary || summary.totalDeductiblesMxn === 0

  // Group sources by tipoEconomico for confirmation panel
  const incomeByObligation = sources.reduce((acc, src) => {
    const key = src.tipoEconomico || 'OTRO'
    acc[key] = (acc[key] || 0) + (src.montoAnualEstimado || 0)
    return acc
  }, {})

  return (
    <AppLayout>
      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      <BufferResultPage key={resultKey} />
      {noDeductions && (
        <div className="mb-5">
          <AlertBanner
            type="warning"
            message="Sin deducciones registradas, el buffer puede estar sobreestimado. ¿Quieres agregar gastos primero?"
            action="Agregar gastos"
            onAction={() => navigate('/app/expenses/new')}
            secondAction="Calcular de todas formas"
            onSecondAction={handleCalculate}
          />
        </div>
      )}
    </AppLayout>
  )
}
