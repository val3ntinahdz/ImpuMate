import React from 'react'

export default function SecondaryButton({ label, onClick, disabled = false, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg
        border-2 border-primary text-primary font-semibold text-sm
        transition-all duration-150
        hover:bg-primary hover:text-white active:bg-green-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {label}
    </button>
  )
}
