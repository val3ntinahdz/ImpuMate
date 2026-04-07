import React from 'react'
import PrimaryButton from './PrimaryButton'

export default function EmptyState({ title, subtitle, ctaLabel, onCta, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon ? icon : (
        <svg className="w-20 h-20 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-text-secondary mb-6 max-w-xs">{subtitle}</p>}
      {ctaLabel && onCta && (
        <PrimaryButton label={ctaLabel} onClick={onCta} />
      )}
    </div>
  )
}
