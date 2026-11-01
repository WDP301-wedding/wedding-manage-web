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
      className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-4 shadow-hy-1"
    >
      <div className="relative h-[168px] min-w-0 flex-[0_1_280px] overflow-hidden rounded-lg max-sm:flex-[1_1_100%]">
        <Image
          src="/images/hero-sanh-tiec.webp"
          alt="Sảnh tiệc của nhà hàng"
          fill
          sizes="(min-width: 640px) 280px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2 py-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="estate-showcase-title" className="text-lg font-bold">
            {restaurant?.displayName || 'Hỷ Yến'}
          </h2>
          {isManager ? (
            <Link
              href="/catalog"
              prefetch={false}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Quản lý danh mục
            </Link>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          Trung tâm tiệc cưới &amp; Sự kiện
          {restaurant?.description ? `. ${restaurant.description}` : ''}
        </p>
        <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Địa chỉ</dt>
            <dd>{restaurant?.address || 'Chưa cập nhật'}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Liên hệ</dt>
            <dd className="break-all">{restaurant?.publicEmail || 'Chưa cập nhật'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
