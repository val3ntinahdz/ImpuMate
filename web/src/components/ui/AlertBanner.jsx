const config = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' },
  warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' },
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' },
}

export default function AlertBanner({ type = 'info', message, action, onAction, secondAction, onSecondAction }) {
  const c = config[type] || config.info
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${c.bg} ${c.border} mt-5`}>
      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.text}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d={c.icon} clipRule="evenodd" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${c.text}`}>{message}</p>
        {(action || secondAction) && (
          <div className="mt-2 flex gap-4">
            {action && (
              <button type="button" onClick={onAction} className={`text-sm font-semibold underline ${c.text}`}>
                {action}
              </button>
            )}
            {secondAction && (
              <button type="button" onClick={onSecondAction} className={`text-sm font-semibold underline ${c.text}`}>
                {secondAction}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
