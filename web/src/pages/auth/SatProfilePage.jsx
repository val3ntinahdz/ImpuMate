import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import InputField from '../../components/ui/InputField'
import ToggleRow from '../../components/ui/ToggleRow'
import SelectDropdown from '../../components/ui/SelectDropdown'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import PageHeader from '../../components/ui/PageHeader'
import { updateProfile, updateSatRegimes, updateSatObligations } from '../../api/auth'
import useAuthStore from '../../store/useAuthStore'

const COMPLIANCE_OPTIONS = [
  { value: 'AL_CORRIENTE', label: '✅ Al corriente' },
  { value: 'INCUMPLIMIENTO', label: '❌ Con incumplimientos' },
  { value: 'EN_REVISION', label: '⚠️ En revisión' },
  { value: 'DESCONOCIDO', label: '❓ No lo sé' },
]

const SAT_REGIME_OPTIONS = [
  { value: 'SUELDOS_Y_SALARIOS', label: 'Sueldos y Salarios' },
  { value: 'ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES', label: 'Actividades Empresariales y Profesionales' },
  { value: 'ARRENDAMIENTO', label: 'Arrendamiento' },
  { value: 'RESICO_PERSONAS_FISICAS', label: 'RESICO (Simplificado de Confianza)' },
  { value: 'PLATAFORMAS_TECNOLOGICAS', label: 'Plataformas Tecnológicas' },
]

export default function SatProfilePage() {
  const navigate = useNavigate()
  const { rfc, nombreCompleto } = useAuthStore()
  const [form, setForm] = useState({
    rfc: rfc || '',
    nombreCompleto: nombreCompleto || '',
    esSocioAccionista: false,
    esResidenteExtranjeroConEP: false,
    prefiereResico: false,
    usesBlindRentalDeduction: false,
    estadoCumplimientoSat: 'DESCONOCIDO',
  })
  const [selectedRegimes, setSelectedRegimes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const toggleRegime = (val) => {
    setSelectedRegimes(r => r.includes(val) ? r.filter(x => x !== val) : [...r, val])
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateProfile(form)
      if (selectedRegimes.length) await updateSatRegimes(selectedRegimes)
      navigate('/sessions/new')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el perfil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <PageHeader
          title="Perfil SAT"
          subtitle="Configura tus datos fiscales para que podamos ayudarte mejor"
        />

        {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

        <div className="space-y-4">
          <InputField label="Nombre completo" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange} />
          <InputField label="RFC (13 caracteres)" name="rfc" value={form.rfc} onChange={handleChange} />
          <SelectDropdown
            label="Estado de cumplimiento SAT"
            name="estadoCumplimientoSat"
            value={form.estadoCumplimientoSat}
            onChange={handleChange}
            options={COMPLIANCE_OPTIONS}
          />
          <div className="bg-surface-gray rounded-lg p-4 space-y-3">
            <ToggleRow label="¿Eres socio o accionista de una empresa?" name="esSocioAccionista" value={form.esSocioAccionista} onChange={e => setForm(f => ({ ...f, esSocioAccionista: e.target.value }))} hint="Excluye de RESICO (LISR art. 113-E)" />
            <ToggleRow label="¿Eres residente extranjero con establecimiento permanente?" name="esResidenteExtranjeroConEP" value={form.esResidenteExtranjeroConEP} onChange={e => setForm(f => ({ ...f, esResidenteExtranjeroConEP: e.target.value }))} />
            <ToggleRow label="¿Prefieres RESICO si calificas?" name="prefiereResico" value={form.prefiereResico} onChange={e => setForm(f => ({ ...f, prefiereResico: e.target.value }))} />
            <ToggleRow label="¿Usas deducción ciega del 35% en arrendamiento?" name="usesBlindRentalDeduction" value={form.usesBlindRentalDeduction} onChange={e => setForm(f => ({ ...f, usesBlindRentalDeduction: e.target.value }))} />
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Regímenes registrados en el SAT</p>
            <div className="flex flex-wrap gap-2">
              {SAT_REGIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleRegime(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedRegimes.includes(opt.value)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-secondary border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <PrimaryButton label="Guardar y continuar" onClick={handleSave} loading={loading} className="flex-1" />
            <SecondaryButton label="Omitir por ahora" onClick={() => navigate('/sessions/new')} />
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
