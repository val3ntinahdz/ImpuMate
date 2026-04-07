import React from 'react'

const variants = {
  APROBADO:  { bg: 'bg-green-100', text: 'text-status-success', border: 'border-green-200', label: 'APROBADO' },
  RECHAZADO: { bg: 'bg-red-100',   text: 'text-status-error',   border: 'border-red-200',   label: 'RECHAZADO' },
  ALERTA:    { bg: 'bg-orange-100',text: 'text-status-warning',  border: 'border-orange-200',label: 'ALERTA' },
  INFO:      { bg: 'bg-blue-100',  text: 'text-status-info',     border: 'border-blue-200',  label: 'INFO' },
  RESICO:    { bg: 'bg-purple-100',text: 'text-purple-700',      border: 'border-purple-200',label: 'RESICO' },
}

export default function StatusBadge({ status, label: customLabel, size = 'sm' }) {
  const v = variants[status] || variants.INFO
  const displayLabel = customLabel || v.label

  return (
    <span className={`
      inline-flex items-center font-bold border rounded-full
      ${v.bg} ${v.text} ${v.border}
      ${size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-[11px]'}
    `}>
      {displayLabel}
    </span>
  )
}
