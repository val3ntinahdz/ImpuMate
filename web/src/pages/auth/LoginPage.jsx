import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import InputField from '../../components/ui/InputField'
import PrimaryButton from '../../components/ui/PrimaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import { login, getProfile } from '../../api/auth'
import { getSessions } from '../../api/sessions'
import useAuthStore from '../../store/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Ingresa tu correo'
    if (!form.password) e.password = 'Ingresa tu contraseña'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setApiError(null)
    try {
      const user = await login(form)
      setUser(user)
      // Check if has sessions → redirect accordingly
      const sessions = await getSessions()
      if (sessions && sessions.length > 0) {
        navigate('/sessions')
      } else {
        navigate('/sessions')
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 401) {
        setApiError('Correo o contraseña incorrectos')
      } else if (status === 400) {
        setApiError('Falta correo o contraseña')
      } else {
        setApiError(err.response?.data?.error || 'Error al iniciar sesión. Inténtalo de nuevo.')
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
            <span className="text-primary font-bold text-lg">IM</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Iniciar sesión</h1>
          <p className="text-sm text-text-secondary mt-1">Bienvenido de vuelta</p>
        </div>

        {apiError && (
          <div className="mb-4">
            <AlertBanner type="error" message={apiError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            required
            autoComplete="current-password"
          />

          <PrimaryButton
            label="Iniciar sesión"
            type="submit"
            loading={loading}
            className="w-full mt-2"
          />
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
