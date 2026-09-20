interface ConfidenceBarProps {
  confidence: number // 0 to 1 or 0 to 100
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ConfidenceBar({
  confidence,
  showLabel = true,
  size = 'md',
  className = '',
}: ConfidenceBarProps) {
  // Normalize to 0-100 percentage
  const percentage = Math.min(100, Math.max(0, confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence)))
  const scoreDecimal = (percentage / 100).toFixed(2)

  let barColor = 'var(--success)'
  let textColor = 'var(--success-dark)'
  let labelText = 'High confidence'

  if (percentage < 45) {
    barColor = 'var(--danger)'
    textColor = 'var(--danger-dark)'
    labelText = 'Low confidence'
  } else if (percentage < 70) {
    barColor = 'var(--signal)'
    textColor = 'var(--signal-dark)'
    labelText = 'Moderate confidence'
  }

  const height = size === 'sm' ? '4px' : '6px'

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          <span className="font-medium text-[var(--ink-muted)] text-[11px]">{labelText}</span>
          <span className="font-semibold" style={{ color: textColor }}>
            {scoreDecimal} <span className="text-[var(--ink-faint)] font-normal">({percentage}%)</span>
          </span>
        </div>
      )}
      <div
        className="w-full rounded-[var(--radius-xs)] overflow-hidden bg-[var(--line)]"
        style={{ height }}
        role="meter"
        aria-label="Model detection confidence"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-[var(--radius-xs)] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
