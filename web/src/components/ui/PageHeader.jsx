import React from 'react'
import { Link } from 'react-router-dom'

export default function PageHeader({ title, subtitle, breadcrumb }) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-text-secondary mb-2">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {item.href ? (
                <Link to={item.href} className="hover:text-primary transition-colors">{item.label}</Link>
              ) : (
                <span className="text-text-primary font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <h1 className="text-[22px] font-bold text-primary leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
    </div>
  )
}
