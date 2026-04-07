import React from 'react'

export default function ToggleRow({ label, value, onChange, hint, disabled = false, name }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4 py-2">
        <span className={`text-sm font-medium text-text-primary ${disabled ? 'opacity-50' : ''}`}>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          disabled={disabled}
          onClick={() => !disabled && onChange({ target: { name, value: !value } })}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            ${value ? 'bg-accent' : 'bg-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${value ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
      {hint && (
        <p className="text-xs text-text-secondary ml-0">{hint}</p>
      )}
    </div>
  )
}
