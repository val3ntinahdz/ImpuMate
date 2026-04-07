import React from 'react'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-surface-gray">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
