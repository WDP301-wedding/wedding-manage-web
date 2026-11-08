import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';

export function StaffCheckinBanner() {
  return (
    <section
      id="staff-checkin-banner"
      className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1"
    >
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 className="text-xl font-semibold">Tiệc được phân công &amp; Tác nghiệp</h2>
        <p className="text-muted-foreground">
          Bạn đang đăng nhập với vai trò <strong>Nhân viên vận hành (Staff)</strong>. Mở tiệc được
          phân công để xem kịch bản, sơ đồ bàn, cập nhật công việc, báo sự cố và bàn giao.
        </p>
      </div>
      <Link href="/staff" prefetch={false} className={buttonVariants()}>
        Xem tiệc được phân công
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}
