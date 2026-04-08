import React from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import PersonalDataTab from './tabs/PersonalDataTab'
import IncomeSourcesTab from './tabs/IncomeSourcesTab'
import RegimeTab from './tabs/RegimeTab'

const TABS = [
  { key: 'data', label: 'Datos personales' },
  { key: 'sources', label: 'Fuentes de ingreso' },
  { key: 'regime', label: 'Mi régimen' },
]

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'data'

  const setTab = (key) => setSearchParams({ tab: key }, { replace: true })

  return (
    <AppLayout>
      <PageHeader title="Perfil" subtitle="Gestiona tus datos fiscales y preferencias." />

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'data' && <PersonalDataTab />}
      {activeTab === 'sources' && <IncomeSourcesTab />}
      {activeTab === 'regime' && <RegimeTab />}
    </AppLayout>
  )
}
