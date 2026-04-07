import React, { useState } from 'react'

export default function InputField({
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  name,
  placeholder = ' ',
  required = false,
  disabled = false,
  className = '',
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            peer w-full px-4 pt-6 pb-2 rounded-lg border text-sm bg-surface-input
            placeholder-transparent outline-none transition-all
            ${error
              ? 'border-status-error focus:border-status-error'
              : 'border-gray-200 focus:border-primary'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <label
          htmlFor={name}
          className={`
            absolute left-4 text-xs font-medium transition-all duration-150 pointer-events-none
            top-2
            ${error ? 'text-status-error' : 'text-text-secondary'}
            peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
            peer-focus:top-2 peer-focus:text-xs
          `}
        >
          {label}{required && <span className="text-status-error ml-0.5">*</span>}
        </label>
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
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
