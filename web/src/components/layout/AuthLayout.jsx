import React from 'react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {children}
      </div>
    </div>
  )
}
