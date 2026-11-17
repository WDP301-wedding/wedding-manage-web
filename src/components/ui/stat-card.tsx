import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Skeleton } from './skeleton';
import styles from '@/src/components/ui/styles/stat-card.module.css';

type StatCardProps = Readonly<{
  label: string;
  value: ReactNode;
  description?: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error';
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}>;

/** Presentation only: callers own queries, calculations and selection behavior. */
export function StatCard({
  label,
  value,
  description,
  tone = 'neutral',
  selected = false,
  loading = false,
  disabled = false,
  onClick,
  ariaLabel,
}: StatCardProps) {
  const content = (
    <>
      {loading && !label ? (
        <Skeleton className="h-3.5 w-20" />
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <span className={styles.value} data-tone={tone}>
          {value}
        </span>
      )}
      {description != null &&
        (loading ? (
          <Skeleton className="h-3.5 w-32 max-w-full" />
        ) : (
          <span className={styles.description}>{description}</span>
        ))}
    </>
  );
  const className = cn(styles.card, onClick && styles.interactive);
  return onClick ? (
    <button
      type="button"
      className={className}
      data-selected={selected}
      aria-pressed={selected}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div
      className={className}
      data-selected={selected}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      {content}
    </div>
  );
}

export function StatCardGroup({
  children,
  label,
  loading = false,
  layout = 'compact',
}: Readonly<{
  children: ReactNode;
  label?: string;
  loading?: boolean;
  layout?: 'compact' | 'wide';
}>) {
  return (
    <div
      className={styles.group}
      data-layout={layout}
      role="group"
      aria-label={label}
      aria-busy={loading || undefined}
    >
      {children}
    </div>
  );
}

export function StatCardSkeleton() {
  return <StatCard label="" value="" loading />;
}
