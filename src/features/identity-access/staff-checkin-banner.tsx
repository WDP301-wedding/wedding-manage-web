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
        <h2 className="text-xl font-semibold">Bàn đón tiếp &amp; Điểm danh khách mời</h2>
        <p className="text-muted-foreground">
          Bạn đang đăng nhập với vai trò <strong>Nhân viên vận hành (Staff)</strong>. Truy cập Bàn
          đón khách để nhập mã tiệc cưới, tra cứu tên khách và hướng dẫn vị trí bàn tiệc.
        </p>
      </div>
      <Link href="/staff" prefetch={false} className={buttonVariants()}>
        Vào bàn đón khách &amp; Check-in
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}
