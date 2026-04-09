import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { formatMXN } from '../../utils/format'
import useSessionStore from '../../store/useSessionStore'

// TODO: replace with real API call using sessionId
const MOCK_DATA = {
  // User
  userName: 'Valentina',

  // Regimes (user has 2)
  regimes: [
    { label: 'Sueldos y Salarios',           ingresoAnual: 240000 },
    { label: 'Régimen General Serv. Prof.',   ingresoAnual: 200000 },
  ],
  categoriaFiscal: 'Sueldos y Salarios + Serv. Profesionales',

  // ISR
  isrAnual:           74620,  // ISR anual estimado total (ambos regímenes)
  pagosProvisionales: 28000,  // pagos provisionales acumulados en el año
  // ISR neto = isrAnual - pagosProvisionales = 46,620 a pagar

  // IVA — solo aplica al régimen de Serv. Profesionales
  // IVA causado: 200,000 * 0.16 = 32,000
  // Sin IVA acreditable por ahora
  ivaCausado: 32000,

  // Progress bar — pagos provisionales vs ISR anual
  isrProgressPercent: Math.round((28000 / 74620) * 100), // ~37%

  // Deducibles
  totalDeductivosMxn:   18450,
  topeGlobalDeducibles: 32396,

  // Fondo para impuestos (Tax Buffer)
  apartadoAcumulado: 2600,
  apartadoMeta:      4191,
  apartadoPercent:   Math.round((2600 / 4191) * 100), // ~62%
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()

  return (
    <AppLayout fullWidth>
      <div className="bg-gray-50 min-h-screen pb-24">
        <section className="px-5 pt-5">
          <h2 className="text-xl font-semibold text-gray-900">
            ¡Hola, {MOCK_DATA.userName}! 👋
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Aquí está tu resumen fiscal actualizado.
          </p>
        </section>

        <section className="px-5 mt-5">
          <div
            style={{ background: '#2D5016', borderRadius: 16, padding: 20 }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                ISR anual estimado
              </span>
              <span style={{ color: '#fff', fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
                {formatMXN(MOCK_DATA.isrAnual)}
              </span>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.25)',
                height: 8,
                borderRadius: 999,
                marginTop: 14,
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: '#B5E550',
                  width: MOCK_DATA.isrProgressPercent + '%',
                  height: '100%',
                  borderRadius: 999,
                }}
              />
            </div>

            <div className="flex justify-between gap-2">
              <div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                  {formatMXN(MOCK_DATA.pagosProvisionales)}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                  en pagos provisionales
                </p>
              </div>
              <div className="text-right">
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                  {formatMXN(MOCK_DATA.ivaCausado)}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                  IVA a pagar
                </p>
              </div>
            </div>

            {/* Separator */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.2)',
                marginTop: 14,
                marginBottom: 10,
              }}
            />

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>
              ISR pendiente:{' '}
              <span style={{ fontWeight: 600 }}>
                {formatMXN(MOCK_DATA.isrAnual - MOCK_DATA.pagosProvisionales)}
              </span>
            </p>
          </div>
        </section>

        
        <section className="px-5 mt-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Acumulado</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">
                {formatMXN(MOCK_DATA.totalDeductivosMxn)}
              </p>
              <p className="text-xs text-gray-500 mt-3">Puedes deducir hasta</p>
              <p className="text-xl font-semibold mt-0.5" style={{ color: '#2D5016' }}>
                {formatMXN(MOCK_DATA.topeGlobalDeducibles)}
              </p>
            </div>

            <div className="flex-shrink-0">
              <button
                onClick={() => navigate('/app/expenses')}
                style={{
                  background: '#B5E550',
                  color: '#2D5016',
                  fontWeight: 600,
                  borderRadius: 10,
                  padding: 16,
                  minWidth: 110,
                  minHeight: 80,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 18 }}>→</span>
                <span style={{ fontSize: 13 }}>Ver desglose completo</span>
              </button>
            </div>
          </div>
        </section>

        <section className="px-5 mt-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Régimen fiscal identificado</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {MOCK_DATA.categoriaFiscal}
            </p>
            <button
              onClick={() => navigate('/app/regime/sources/new')}
              style={{
                background: '#B5E550',
                color: '#2D5016',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
              className="mt-4 rounded-xl py-3 text-sm"
            >
              Agregar fuente de ingreso
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
