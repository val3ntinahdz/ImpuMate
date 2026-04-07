import React from 'react'

export default function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      {label && (
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}
