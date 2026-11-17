import Image from 'next/image';
import Link from 'next/link';
import type { PublicRestaurant } from '../../services/catalog.service';

export function DashboardVenueCard({
  restaurant,
  isManager,
}: Readonly<{ restaurant: PublicRestaurant | null; isManager: boolean }>) {
  return (
    <section
      aria-labelledby="estate-showcase-title"
      className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-5 shadow-hy-1"
    >
      <div className="relative h-[160px] min-w-0 flex-[0_1_280px] overflow-hidden rounded-lg max-sm:flex-[1_1_100%]">
        <Image
          src="/images/hero-sanh-tiec.webp"
          alt="Không gian sảnh tiệc của trung tâm"
          fill
          sizes="(min-width: 640px) 280px, 100vw"
          className="object-cover"
        />
        <div className="absolute top-2.5 left-2.5 rounded bg-hy-ink/80 px-2 py-0.5 text-2xs font-semibold text-white backdrop-blur-xs">
          Chi nhánh hoạt động
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_360px] flex-col justify-between gap-3 py-1">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 id="estate-showcase-title" className="text-xl font-bold text-foreground">
                {restaurant?.displayName || 'Trung tâm tiệc cưới Hỷ Yến'}
              </h2>
              <span className="rounded border border-hy-wine/20 bg-hy-wine-soft px-2 py-0.5 text-2xs font-semibold text-hy-wine">
                5 Sao
              </span>
            </div>
            {isManager ? (
              <Link
                href="/catalog"
                prefetch={false}
                className="text-xs font-semibold text-primary transition-colors hover:text-hy-wine-pressed hover:underline"
              >
                Cấu hình sảnh &amp; thực đơn →
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Trung tâm tiệc cưới &amp; Sự kiện cao cấp
            {restaurant?.description ? ` • ${restaurant.description}` : ''}
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-2xs font-semibold text-muted-foreground">ĐỊA CHỈ TRUNG TÂM</dt>
            <dd className="font-medium text-foreground">{restaurant?.address || 'Chưa cập nhật địa chỉ'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-2xs font-semibold text-muted-foreground">EMAIL LIÊN HỆ ĐIỀU HÀNH</dt>
            <dd className="break-all font-medium text-foreground">{restaurant?.publicEmail || 'Chưa cập nhật email'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
