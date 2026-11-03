import { Suspense } from 'react';
import { ManagerArchivePage } from '../../src/features/booking-archive/manager-archive-page';
export default function Page() {
  return (
    <Suspense fallback={<p>Đang mở hồ sơ đã hủy…</p>}>
      <ManagerArchivePage />
    </Suspense>
  );
}
