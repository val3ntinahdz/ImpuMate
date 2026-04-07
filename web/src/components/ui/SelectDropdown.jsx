import React from 'react'

export default function SelectDropdown({
  label,
  options = [],
  value,
  onChange,
  error,
  name,
  required = false,
  disabled = false,
  placeholder = 'Selecciona una opción',
  className = '',
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`
            peer w-full px-4 pt-6 pb-2 rounded-lg border text-sm bg-surface-input appearance-none
            outline-none transition-all cursor-pointer
            ${!value ? 'text-text-secondary' : 'text-text-primary'}
            ${error
              ? 'border-status-error focus:border-status-error'
              : 'border-gray-200 focus:border-primary'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label
          htmlFor={name}
          className={`
            absolute left-4 top-2 text-xs font-medium pointer-events-none
            ${error ? 'text-status-error' : 'text-text-secondary'}
          `}
        >
          {label}{required && <span className="text-status-error ml-0.5">*</span>}
        </label>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-status-error flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
