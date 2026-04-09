import React from 'react'

export default function MoneyInput({
  label,
  value,
  onChange,
  error,
  hint,
  name,
  required = false,
  disabled = false,
  className = '',
}) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    const cleaned = parts[0] + (parts.length > 1 ? '.' + parts[1] : '')
    onChange({ target: { name, value: cleaned } })
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-text-secondary font-medium pointer-events-none z-10 top-1/2 -translate-y-1/2">$</span>
        <input
          id={name}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder=" "
          required={required}
          disabled={disabled}
          className={`
            peer w-full pl-7 pr-14 pt-6 pb-2 rounded-lg border text-sm bg-surface-input
            placeholder-transparent outline-none transition-all
            ${error
              ? 'border-status-error focus:border-status-error'
              : 'border-gray-200 focus:border-primary'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <span className="absolute right-3 text-xs text-text-secondary font-medium pointer-events-none top-1/2 -translate-y-1/2">MXN</span>
        <label
          htmlFor={name}
          className={`
            absolute left-7 text-xs font-medium transition-all duration-150 pointer-events-none
            top-2
            ${error ? 'text-status-error' : 'text-text-secondary'}
            peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
            peer-focus:top-2 peer-focus:text-xs
          `}
        >
          {label}{required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      </div>
      {error && (
        <p className="mt-1 text-xs text-status-error flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-text-secondary">{hint}</p>
      )}
    </div>
  )
}
