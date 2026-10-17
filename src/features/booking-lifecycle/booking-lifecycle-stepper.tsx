'use client';

export interface BookingLifecycleStepperProps {
  phase: string;
  hasTimeline: boolean;
  hasContract: boolean;
}

const STEPS = [
  { id: 'consultation', label: 'Tư vấn', desc: 'Tiếp nhận yêu cầu' },
  { id: 'draft', label: 'Đề xuất & Giữ sảnh', desc: 'Sảnh, ca & thực đơn' },
  { id: 'timeline', label: 'Kịch bản & Hợp đồng', desc: 'Cam kết 2 bên' },
  { id: 'deposit', label: 'Xác nhận & Cọc', desc: 'Đặt cọc 30%' },
  { id: 'completed', label: 'Hoàn thành', desc: 'Tổ chức & Quyết toán' },
];

export function BookingLifecycleStepper({
  phase,
  hasTimeline,
  hasContract,
}: Readonly<BookingLifecycleStepperProps>) {
  const isCancelled = phase === 'CANCELLED';

  const getStepStatus = (index: number): 'done' | 'active' | 'pending' | 'cancelled' => {
    if (isCancelled) {
      if (index === 0) return 'done';
      return 'cancelled';
    }
    if (phase === 'COMPLETED') return 'done';
    if (phase === 'CONFIRMED') {
      if (index <= 3) return 'done';
      if (index === 4) return 'active';
      return 'pending';
    }
    if (phase === 'AWAITING_DEPOSIT') {
      if (index <= 1) return 'done';
      if (index === 2) return hasTimeline && hasContract ? 'done' : 'active';
      if (index === 3) return 'active';
      return 'pending';
    }
    // DRAFT
    if (index === 0) return 'done';
    if (index === 1) return 'active';
    return 'pending';
  };

  return (
    <div
      className="hy-stepper-container"
      style={{
        background: 'var(--hy-surface-container, #fdf6ee)',
        border: '1px solid var(--hy-outline, #eadfd6)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
      }}
      aria-label="Tiến trình vòng đời tiệc cưới"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--hy-wine, #7a1f3d)',
          }}
        >
          Tiến trình vòng đời tiệc cưới
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: isCancelled
              ? 'var(--hy-status-error-bg, #fdecea)'
              : phase === 'CONFIRMED' || phase === 'COMPLETED'
                ? 'var(--hy-status-success-bg, #e7f1ea)'
                : 'var(--hy-status-warning-bg, #fcefd6)',
            color: isCancelled
              ? 'var(--hy-status-error, #c62828)'
              : phase === 'CONFIRMED' || phase === 'COMPLETED'
                ? 'var(--hy-status-success, #2f6b4f)'
                : 'var(--hy-status-warning, #8a5300)',
            border: `1px solid ${
              isCancelled
                ? 'var(--hy-status-error-border, #fca5a5)'
                : phase === 'CONFIRMED' || phase === 'COMPLETED'
                  ? 'var(--hy-status-success-border, #a7f3d0)'
                  : 'var(--hy-status-warning-border, #fde68a)'
            }`,
          }}
        >
          {isCancelled
            ? 'Đã hủy tiệc'
            : phase === 'CONFIRMED'
              ? 'Đã xác nhận & Cọc'
              : phase === 'COMPLETED'
                ? 'Hoàn thành tiệc'
                : phase === 'AWAITING_DEPOSIT'
                  ? 'Chờ cọc giữ chỗ'
                  : 'Bản nháp đề xuất'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {STEPS.map((step, idx) => {
          const status = getStepStatus(idx);
          const isDone = status === 'done';
          const isActive = status === 'active';
          const isCancel = status === 'cancelled';

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.65rem',
                background: isActive
                  ? '#ffffff'
                  : isDone
                    ? 'rgba(47, 107, 79, 0.08)'
                    : 'transparent',
                border: `1px solid ${
                  isActive
                    ? 'var(--hy-wine, #7a1f3d)'
                    : isDone
                      ? 'var(--hy-status-success-border, #bbf7d0)'
                      : 'var(--hy-outline, #eadfd6)'
                }`,
                borderRadius: '6px',
                boxShadow: isActive ? '0 1px 3px rgba(122, 31, 61, 0.12)' : 'none',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  background: isDone
                    ? 'var(--hy-status-success, #2f6b4f)'
                    : isActive
                      ? 'var(--hy-wine, #7a1f3d)'
                      : isCancel
                        ? 'var(--hy-status-error, #c62828)'
                        : 'var(--hy-outline, #eadfd6)',
                  color:
                    isDone || isActive || isCancel ? '#ffffff' : 'var(--hy-text-muted, #6e5d63)',
                }}
              >
                {isDone ? '✓' : isCancel ? '✕' : idx + 1}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: isActive || isDone ? 700 : 500,
                    color: isActive
                      ? 'var(--hy-wine, #7a1f3d)'
                      : isDone
                        ? 'var(--hy-status-success, #2f6b4f)'
                        : 'var(--hy-text-muted, #6e5d63)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--hy-text-muted, #6e5d63)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
