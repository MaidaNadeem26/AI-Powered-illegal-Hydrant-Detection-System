import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] ${className}`}
    >
      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--ink-muted)] mb-3">
        {icon ?? (
          <svg
            className="w-5 h-5 text-[var(--ink-faint)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        )}
      </div>
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-1 font-[var(--font-display)]">{title}</h3>
      <p className="text-xs text-[var(--ink-muted)] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-[var(--teal-dark)] bg-[var(--teal-tint)] border border-[var(--teal)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-alt)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
