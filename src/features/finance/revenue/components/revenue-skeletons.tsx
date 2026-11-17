'use client';

import { Skeleton } from '@/src/components/ui/skeleton';

export function RevenueTableSkeleton() {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Đang tải dữ liệu bảng">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="grid grid-cols-6 items-center gap-4 px-5 py-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-24 justify-self-end" />
          <Skeleton className="h-4 w-24 justify-self-end" />
          <Skeleton className="h-6 w-20 rounded-md justify-self-end" />
          <Skeleton className="h-8 w-20 rounded-lg justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function RevenueInitialSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Đang tải báo cáo doanh thu">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-hy-1"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-hy-1">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex gap-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <RevenueTableSkeleton />
      </div>
    </div>
  );
}
