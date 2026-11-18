import type { BookingSeatingPlan } from '@/src/services/bookings/seating.service';

export function SeatingPlanView({
  tables,
}: Readonly<{ tables: BookingSeatingPlan['renderSnapshot'] }>) {
  const bounds = tables.map((t) => {
    const angle = (t.rotationDegrees * Math.PI) / 180;
    const w = Math.abs(Math.cos(angle)) * t.width + Math.abs(Math.sin(angle)) * t.height;
    const h = Math.abs(Math.sin(angle)) * t.width + Math.abs(Math.cos(angle)) * t.height;
    return {
      left: t.x + t.width / 2 - w / 2,
      top: t.y + t.height / 2 - h / 2,
      right: t.x + t.width / 2 + w / 2,
      bottom: t.y + t.height / 2 + h / 2,
    };
  });
  const left = Math.min(0, ...bounds.map((b) => b.left)),
    top = Math.min(0, ...bounds.map((b) => b.top));
  const width = Math.max(1, ...bounds.map((b) => b.right)) - left,
    height = Math.max(1, ...bounds.map((b) => b.bottom)) - top;
  const padding = Math.max(width, height) * 0.04;
  return (
    <>
      <svg
        className="max-h-[32rem] min-h-48 w-full rounded-lg bg-muted p-3"
        viewBox={`${left - padding} ${top - padding} ${width + padding * 2} ${height + padding * 2}`}
        role="img"
        aria-label="Sơ đồ vị trí bàn tiệc, xem danh sách bên dưới để biết nhóm khách"
      >
        {tables.map((t) => (
          <g
            key={t.layoutTableId}
            transform={`translate(${t.x + t.width / 2} ${t.y + t.height / 2}) rotate(${t.rotationDegrees})`}
          >
            {t.shape === 'ROUND' ? (
              <ellipse
                rx={t.width / 2}
                ry={t.height / 2}
                fill={t.color ?? 'var(--hy-surface)'}
                stroke="var(--hy-ink)"
                strokeWidth={Math.min(t.width, t.height) * 0.01}
              />
            ) : (
              <rect
                x={-t.width / 2}
                y={-t.height / 2}
                width={t.width}
                height={t.height}
                rx={Math.min(t.width, t.height) * 0.07}
                fill={t.color ?? 'var(--hy-surface)'}
                stroke="var(--hy-ink)"
                strokeWidth={Math.min(t.width, t.height) * 0.01}
              />
            )}
            <g transform={`rotate(${-t.rotationDegrees})`}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--hy-ink)"
                paintOrder="stroke"
                stroke="var(--hy-surface)"
                strokeWidth={Math.min(t.width, t.height) * 0.025}
                fontSize={Math.min(t.width, t.height) * 0.19}
              >
                {t.tableLabel}
              </text>
            </g>
          </g>
        ))}
      </svg>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((t) => (
          <li key={t.layoutTableId} className="rounded-lg border border-border p-3 text-sm">
            <strong>{t.tableLabel}</strong>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              {t.color && (
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: t.color }}
                />
              )}
              {t.guestGroupName ?? 'Chưa gán nhóm khách'}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
