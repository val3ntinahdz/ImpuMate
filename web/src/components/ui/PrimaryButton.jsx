import React from 'react'

export default function PrimaryButton({ label, onClick, loading = false, disabled = false, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg
        bg-primary text-accent font-semibold text-sm
        transition-all duration-150
        hover:opacity-90 active:opacity-80
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {label}
    </button>
  )
}
