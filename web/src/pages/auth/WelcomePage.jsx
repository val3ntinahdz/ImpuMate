import React from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'

export default function WelcomePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-accent flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-white font-bold text-3xl">IM</span>
      </div>
      <h1 className="text-4xl font-bold text-white mb-3">ImpuMate</h1>
      <p className="text-white/80 text-lg max-w-sm mb-10">
        Educación fiscal para la generación que trabaja distinto
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <PrimaryButton
          label="Comenzar"
          onClick={() => navigate('/register')}
          className="w-full bg-white text-primary hover:bg-white/90"
        />
        <SecondaryButton
          label="Ya tengo cuenta — Iniciar sesión"
          onClick={() => navigate('/login')}
          className="w-full border-white text-white hover:bg-white hover:text-primary"
        />
      </div>
    </div>
  )
}
