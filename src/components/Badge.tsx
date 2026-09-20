export type StatusType = 'pending' | 'verified' | 'unverified' | 'further_investigation'

interface BadgeProps {
  status: StatusType | string
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
}

export const statusConfig: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  pending: {
    label: 'Pending review',
    icon: '?',
    bg: 'var(--signal-tint)',
    text: 'var(--signal-dark)',
    border: 'var(--signal)',
  },
  verified: {
    label: 'Verified on site',
    icon: '✓',
    bg: 'var(--success-tint)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  unverified: {
    label: 'Unverified / false alarm',
    icon: '✕',
    bg: 'var(--danger-tint)',
    text: 'var(--danger-dark)',
    border: 'var(--danger)',
  },
  further_investigation: {
    label: 'Further investigation',
    icon: '!',
    bg: 'var(--signal-tint)',
    text: 'var(--signal-dark)',
    border: 'var(--signal)',
  },
}

export function Badge({ status, size = 'md', showIcon = true, className = '' }: BadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' '),
    icon: '•',
    bg: 'var(--surface-alt)',
    text: 'var(--ink-muted)',
    border: 'var(--line-strong)',
  }

  const isSmall = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-[var(--radius-sm)] ${
        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      {showIcon && (
        <span
          className="inline-grid place-items-center rounded-[var(--radius-xs)] font-mono font-bold leading-none"
          style={{
            width: isSmall ? '12px' : '14px',
            height: isSmall ? '12px' : '14px',
            fontSize: isSmall ? '9px' : '10px',
            background: 'currentColor',
            color: 'white',
          }}
          aria-hidden="true"
        >
          <span style={{ color: config.bg }}>{config.icon}</span>
        </span>
      )}
      <span>{config.label}</span>
    </span>
  )
}
