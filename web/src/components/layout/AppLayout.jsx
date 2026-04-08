import React from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'

export default function AppLayout({ children, fullWidth = false }) {
  return (
    <div className="flex min-h-screen bg-surface-gray">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {fullWidth ? (
          children
        ) : (
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {children}
          </div>
        )}
      </main>

      {/* Tab bar — mobile only */}
      <TabBar />
    </div>
  )
}
