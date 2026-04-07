import React from 'react'
import { formatMXN } from '../../utils/format'

export default function BigNumberCard({ amount, label, sublabel, bgColor = 'bg-primary', textColor = 'text-white', className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${bgColor} ${className}`}>
      <p className={`text-[48px] leading-none font-bold ${textColor}`} style={{ fontFamily: 'Inter, sans-serif' }}>
        {formatMXN(amount)}
      </p>
      {label && (
        <p className={`mt-2 text-sm font-semibold ${textColor} opacity-90`}>{label}</p>
      )}
      {sublabel && (
        <p className={`mt-1 text-xs ${textColor} opacity-70`}>{sublabel}</p>
      )}
    </div>
  )
}
