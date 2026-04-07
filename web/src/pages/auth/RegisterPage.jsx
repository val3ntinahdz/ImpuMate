import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import InputField from '../../components/ui/InputField'
import PrimaryButton from '../../components/ui/PrimaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import { register } from '../../api/auth'
import useAuthStore from '../../store/useAuthStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const [form, setForm] = useState({ nombreCompleto: '', email: '', password: '', rfc: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: name === 'rfc' ? value.toUpperCase() : value }))
    setErrors(er => ({ ...er, [name]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.nombreCompleto || form.nombreCompleto.trim().length < 3) e.nombreCompleto = 'Mínimo 3 caracteres'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo inválido'
    if (!form.password || form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (!form.rfc || form.rfc.length !== 13) e.rfc = 'El RFC debe tener 13 caracteres'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setApiError(null)
    try {
      const user = await register(form)
      setUser(user)
      navigate('/setup')
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        setApiError({ type: 'conflict', message: 'Este correo ya tiene cuenta. ¿Quieres iniciar sesión?' })
      } else {
        setApiError({ type: 'error', message: err.response?.data?.error || 'Error al crear la cuenta. Inténtalo de nuevo.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">IM</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Crear cuenta</h1>
          <p className="text-sm text-text-secondary mt-1">Empieza tu educación fiscal hoy</p>
        </div>

        {apiError && (
          <div className="mb-4">
            <AlertBanner
              type={apiError.type === 'conflict' ? 'warning' : 'error'}
              message={apiError.message}
              action={apiError.type === 'conflict' ? 'Iniciar sesión' : null}
              onAction={() => navigate('/login')}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Nombre completo"
            name="nombreCompleto"
            value={form.nombreCompleto}
            onChange={handleChange}
            error={errors.nombreCompleto}
            required
            autoComplete="name"
          />
          <InputField
            label="Correo electrónico"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoComplete="email"
          />
          <InputField
            label="Contraseña"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint="Mínimo 8 caracteres"
            required
            autoComplete="new-password"
          />
          <InputField
            label="RFC (13 caracteres)"
            name="rfc"
            value={form.rfc}
            onChange={handleChange}
            error={errors.rfc}
            required
            autoComplete="off"
          />

          <PrimaryButton
            label="Crear cuenta"
            type="submit"
            loading={loading}
            className="w-full mt-2"
          />
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
