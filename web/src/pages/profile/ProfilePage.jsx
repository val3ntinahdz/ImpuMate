import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import InputField from '../../components/ui/InputField'
import ToggleRow from '../../components/ui/ToggleRow'
import SelectDropdown from '../../components/ui/SelectDropdown'
import PrimaryButton from '../../components/ui/PrimaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import SectionDivider from '../../components/ui/SectionDivider'
import { getProfile, updateProfile, updateSatRegimes, updateSatObligations, logout } from '../../api/auth'
import useAuthStore from '../../store/useAuthStore'
import useSessionStore from '../../store/useSessionStore'

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

export default function ProfilePage() {
  const navigate = useNavigate()
  const { setUser, clearUser } = useAuthStore()
  const { clearSession } = useSessionStore()

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    nombreCompleto: '',
    rfc: '',
    esSocioAccionista: false,
    esResidenteExtranjeroConEP: false,
    prefiereResico: false,
    usesBlindRentalDeduction: false,
    estadoCumplimientoSat: 'DESCONOCIDO',
  })
  const [selectedRegimes, setSelectedRegimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    getProfile()
      .then(data => {
        setProfile(data)
        setForm({
          nombreCompleto: data.nombreCompleto || '',
          rfc: data.rfc || '',
          esSocioAccionista: data.esSocioAccionista || false,
          esResidenteExtranjeroConEP: data.esResidenteExtranjeroConEP || false,
          prefiereResico: data.prefiereResico || false,
          usesBlindRentalDeduction: data.usesBlindRentalDeduction || false,
          estadoCumplimientoSat: data.estadoCumplimientoSat || 'DESCONOCIDO',
        })
        setSelectedRegimes(data.satRegimes || [])
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar el perfil.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const toggleRegime = (val) => {
    setSelectedRegimes(r => r.includes(val) ? r.filter(x => x !== val) : [...r, val])
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProfile(form)
      setUser({ id: updated.id, email: updated.email, rfc: updated.rfc, nombreCompleto: updated.nombreCompleto })
      await updateSatRegimes(selectedRegimes)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearUser()
    clearSession()
    navigate('/login')
  }

  if (loading) return <LoadingSpinner message="Cargando perfil…" />

  return (
    <AppLayout>
      <PageHeader title="Perfil" subtitle="Gestiona tus datos fiscales y preferencias." />

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}
      {savedMsg && (
        <div className="mb-4">
          <AlertBanner
            type="success"
            message="Cambios guardados. Si ya identificaste tu régimen, considera volver a ejecutar el identificador para actualizarlo."
          />
        </div>
      )}

      <div className="max-w-2xl space-y-5">
        {/* Basic data */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Datos básicos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Nombre completo"
              name="nombreCompleto"
              value={form.nombreCompleto}
              onChange={handleChange}
            />
            <InputField
              label="RFC"
              name="rfc"
              value={form.rfc}
              onChange={handleChange}
            />
          </div>
          {profile && (
            <div className="text-sm text-text-secondary">
              <span className="font-medium">Correo:</span> {profile.email}
            </div>
          )}
        </div>

        {/* Fiscal status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Situación fiscal</h2>
          <SelectDropdown
            label="Estado de cumplimiento SAT"
            name="estadoCumplimientoSat"
            value={form.estadoCumplimientoSat}
            onChange={handleChange}
            options={COMPLIANCE_OPTIONS}
          />
          <div className="space-y-3">
            <ToggleRow label="¿Eres socio o accionista de una empresa?" name="esSocioAccionista" value={form.esSocioAccionista} onChange={e => setForm(f => ({ ...f, esSocioAccionista: e.target.value }))} />
            <ToggleRow label="¿Eres residente extranjero con establecimiento permanente?" name="esResidenteExtranjeroConEP" value={form.esResidenteExtranjeroConEP} onChange={e => setForm(f => ({ ...f, esResidenteExtranjeroConEP: e.target.value }))} />
          </div>
        </div>

        {/* RESICO preferences */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-text-primary">Preferencias RESICO</h2>
          <ToggleRow label="¿Prefieres tributar en RESICO si calificas?" name="prefiereResico" value={form.prefiereResico} onChange={e => setForm(f => ({ ...f, prefiereResico: e.target.value }))} />
          <ToggleRow label="¿Usas deducción ciega del 35% en arrendamiento?" name="usesBlindRentalDeduction" value={form.usesBlindRentalDeduction} onChange={e => setForm(f => ({ ...f, usesBlindRentalDeduction: e.target.value }))} />
        </div>

        {/* SAT regimes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-text-primary mb-3">Regímenes registrados en el SAT</h2>
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

        <PrimaryButton label="Guardar cambios" onClick={handleSave} loading={saving} className="w-full" />

        <SectionDivider label="Sesión" />

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-text-secondary mb-3">
            Al cerrar sesión se borrarán los datos de sesión fiscal del navegador.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-status-error text-status-error font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
