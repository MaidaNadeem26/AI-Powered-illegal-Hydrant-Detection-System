import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-sm)] bg-[var(--line)]/60 ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-3 w-full"
          style={{ width: index === lines - 1 && lines > 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`p-4 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] space-y-3 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16 rounded-[var(--radius-pill)]" />
      </div>
      <SkeletonText lines={2} />
      <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--line)] bg-[var(--surface)]" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
          </div>
        </div>
      ))}
    </div>
  )
}
