import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import { DIRECTORY_SECTIONS } from '../../data/directoryMockData'

function InvoicePill() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-status-success border border-green-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Acepta facturas
    </span>
  )
}

function DirectoryCard({ item }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm">{item.name}</p>
          <p className="text-xs text-text-secondary mt-0.5">{item.specialty}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {item.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {item.phone}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {item.acceptsInvoice && <InvoicePill />}
        </div>
      </div>
    </div>
  )
}

export default function DirectoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Directorio de servicios"
          subtitle="Proveedores verificados que emiten CFDI para tus deducciones."
        />
        <button
          onClick={() => navigate('/app/expenses')}
          className="text-sm text-text-secondary hover:text-primary transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, especialidad o ubicación…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Sections */}
      {DIRECTORY_SECTIONS.map(section => {
        const filtered = section.items.filter(item => {
          const q = search.toLowerCase()
          return (
            item.name.toLowerCase().includes(q) ||
            item.specialty.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q)
          )
        })

        return (
          <div key={section.id} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{section.icon}</span>
              <h2 className="font-semibold text-text-primary">{section.label}</h2>
              <span className="text-xs text-text-secondary">({filtered.length})</span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">
                No se encontraron resultados para "{search}".
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map(item => (
                  <DirectoryCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </AppLayout>
  )
}
