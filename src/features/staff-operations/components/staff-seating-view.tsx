import { SeatingPlanView } from '@/src/components/data-display/seating-plan-view';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { cardClass } from '@/src/features/staff-operations/styles/staff-classes';
export function StaffSeatingView({ view }: Readonly<{ view: StaffWorkspace }>) {
  const tables = view.seating.renderSnapshot;
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold">Sơ đồ bàn và hướng dẫn nhóm khách</h2>
      {view.seating.status !== 'CONFIRMED' && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {view.seating.status === 'ABSENT'
            ? 'Chưa có sơ đồ bàn cho tiệc này.'
            : 'Sơ đồ đang là bản nháp hoặc cần rà soát. Xác nhận với Manager trước khi hướng dẫn khách.'}
        </p>
      )}
      {tables.length > 0 && <SeatingPlanView tables={tables} />}
    </section>
  );
}
