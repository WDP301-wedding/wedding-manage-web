'use client';

import { useMemo } from 'react';
import { Award, Building2, TrendingUp, Utensils } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { formatVnd } from '../../lib/formatters';
import type { AnalyticsOverviewData } from '../../services/analytics.service';
import type { PublicHall } from '../../services/catalog.service';
import type { DashboardBookingItem } from './use-dashboard-bookings';
import {
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
} from './dashboard-classes';

export interface HallRevenueItem {
  hallId: string;
  hallName: string;
  revenueVnd: number;
  bookingCount: number;
  percentage: number;
}

export interface PopularMenuItem {
  sourceId: string;
  name: string;
  bookingCount: number;
  tableCount: number;
}

export function DashboardAnalyticsExtra({
  analytics,
  halls,
  bookings = [],
  isManager = false,
}: Readonly<{
  analytics: AnalyticsOverviewData | null;
  halls: readonly PublicHall[];
  bookings?: readonly DashboardBookingItem[];
  isManager?: boolean;
}>) {
  if (!isManager) return null;

  // 1. Tính toán doanh thu theo từng sảnh
  const hallRevenues = useMemo<HallRevenueItem[]>(() => {
    // Nếu analytics từ backend có hallRevenues (sẽ mở rộng ở backend)
    const backendHalls = (analytics as unknown as { hallRevenues?: HallRevenueItem[] })?.hallRevenues;
    if (backendHalls && backendHalls.length > 0) {
      const backendMap = new Map(backendHalls.map((h) => [h.hallId, h]));
      const totalRev = backendHalls.reduce((sum, h) => sum + (h.revenueVnd || 0), 0) || 1;
      const merged: HallRevenueItem[] = backendHalls.map((h) => ({
        ...h,
        percentage: Math.round(((h.revenueVnd || 0) / totalRev) * 100),
      }));
      for (const hall of halls) {
        if (!backendMap.has(hall.id)) {
          merged.push({
            hallId: hall.id,
            hallName: hall.name,
            revenueVnd: 0,
            bookingCount: 0,
            percentage: 0,
          });
        }
      }
      return merged.sort((a, b) => b.revenueVnd - a.revenueVnd || b.bookingCount - a.bookingCount || a.hallName.localeCompare(b.hallName));
    }

    // Fallback: Tính toán từ bookings và analytics netCashRevenue
    const hallMap = new Map<
      string,
      { name: string; count: number; tables: number; directRev: number }
    >();
    for (const h of halls) {
      hallMap.set(h.id, { name: h.name, count: 0, tables: 0, directRev: 0 });
    }

    for (const b of bookings) {
      if (b.phase === 'CANCELLED' || b.phase === 'DRAFT') continue;
      const existing = hallMap.get(b.hallId) ?? {
        name: b.hallNameSnapshot || 'Sảnh tiệc',
        count: 0,
        tables: 0,
        directRev: 0,
      };
      const item = b as { paidVnd?: number | null; tableCount?: number | null };
      existing.count += 1;
      existing.tables += item.tableCount || 0;
      if (typeof item.paidVnd === 'number' && item.paidVnd > 0) {
        existing.directRev += item.paidVnd;
      }
      hallMap.set(b.hallId, existing);
    }

    const officialRev = analytics?.netCashRevenueVnd ?? analytics?.grossCashReceivedVnd ?? 0;
    const totalTables = Array.from(hallMap.values()).reduce((sum, v) => sum + v.tables, 0);
    const totalBookings = Array.from(hallMap.values()).reduce((sum, v) => sum + v.count, 0);
    const totalDirectRev = Array.from(hallMap.values()).reduce((sum, v) => sum + v.directRev, 0);

    // Ưu tiên số liệu doanh thu chính thức từ Analytics KPI; nếu không có mới dùng tổng directRev
    const effectiveTotalRev = officialRev > 0 ? officialRev : totalDirectRev;

    const list: HallRevenueItem[] = [];
    for (const [hallId, data] of hallMap.entries()) {
      let revenue = 0;
      let percentage = 0;

      if (effectiveTotalRev > 0) {
        if (totalTables > 0) {
          percentage = Math.round((data.tables / totalTables) * 100);
          revenue = Math.round((effectiveTotalRev * data.tables) / totalTables);
        } else if (totalBookings > 0) {
          percentage = Math.round((data.count / totalBookings) * 100);
          revenue = Math.round((effectiveTotalRev * data.count) / totalBookings);
        } else if (totalDirectRev > 0) {
          revenue = data.directRev;
          percentage = Math.round((data.directRev / totalDirectRev) * 100);
        }
      }

      list.push({
        hallId,
        hallName: data.name,
        revenueVnd: revenue,
        bookingCount: data.count,
        percentage,
      });
    }

    return list.sort((a, b) => b.revenueVnd - a.revenueVnd || b.bookingCount - a.bookingCount);
  }, [analytics, halls, bookings]);

  // 2. Tính toán menu nào được khách đặt nhiều nhất
  const popularMenus = useMemo<PopularMenuItem[]>(() => {
    // Từ analytics.menuPopularity (chỉ lấy các thực đơn thực tế đã có lượt đặt)
    if (analytics?.menuPopularity && analytics.menuPopularity.length > 0) {
      return [...analytics.menuPopularity]
        .filter((m) => m.bookingCount > 0)
        .map((m) => ({
          sourceId: m.sourceId,
          name: m.nameSnapshot || 'Thực đơn tiêu chuẩn',
          bookingCount: m.bookingCount,
          tableCount: m.quantity,
        }))
        .sort((a, b) => b.bookingCount - a.bookingCount || b.tableCount - a.tableCount);
    }

    return [];
  }, [analytics]);

  const topMenu = popularMenus[0] ?? null;
  const totalRevenue = hallRevenues.reduce((sum, h) => sum + h.revenueVnd, 0);

  return (
    <section className={sectionClass} aria-label="Thống kê doanh thu sảnh và thực đơn">
      <div className={sectionHeaderClass}>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Phân tích chuyên sâu
          </span>
          <h2 className={sectionTitleClass}>Doanh thu sảnh tiệc &amp; Thực đơn thịnh hành</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Khối 1: Doanh thu theo sảnh */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-hy-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Doanh thu theo sảnh tiệc</h3>
            </div>
            {totalRevenue > 0 && (
              <span className="text-xs text-muted-foreground">
                Tổng: <strong className="text-foreground">{formatVnd(totalRevenue)}</strong>
              </span>
            )}
          </div>

          {hallRevenues.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu sảnh tiệc trong hệ thống.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {hallRevenues.map((h, idx) => (
                <div key={h.hallId} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      <span className="mr-2 text-xs text-muted-foreground">#{idx + 1}</span>
                      Doanh thu {h.hallName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {h.bookingCount} tiệc
                      </span>
                      <strong className="font-semibold tabular-nums text-foreground">
                        {formatVnd(h.revenueVnd)}
                      </strong>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${h.percentage > 0 ? Math.max(h.percentage, 4) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Khối 2: Menu nào được khách đặt nhiều nhất */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-hy-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Thực đơn được khách đặt nhiều nhất</h3>
            </div>
            <TrendingUp className="size-4 text-primary" />
          </div>

          {topMenu && topMenu.bookingCount > 0 ? (
            <div className="flex flex-col gap-4">
              {/* Highlight Top 1 Menu */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="gap-1">
                        <Award className="size-3" />
                        Được đặt nhiều nhất
                      </Badge>
                    </div>
                    <h4 className="text-base font-bold text-foreground">{topMenu.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary tabular-nums">
                      {topMenu.bookingCount}
                    </div>
                    <div className="text-2xs text-muted-foreground">lượt đặt</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
                  <span>
                    Quy mô phục vụ: <strong className="text-foreground">{topMenu.tableCount} bàn</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Tỷ lệ ưa chuộng: <strong className="text-foreground">Số 1 toàn hệ thống</strong>
                  </span>
                </div>
              </div>

              {/* Danh sách các menu tiếp theo */}
              {popularMenus.length > 1 && (
                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Các thực đơn phổ biến khác:
                  </span>
                  <div className="flex flex-col divide-y divide-border">
                    {popularMenus.slice(1, 5).map((m, idx) => (
                      <div key={m.sourceId} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            #{idx + 2}
                          </span>
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{m.tableCount} bàn</span>
                          <span className="font-semibold text-foreground">{m.bookingCount} lượt</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Utensils className="size-8 text-muted-foreground/40" />
              <p>Chưa có dữ liệu đặt thực đơn trong kỳ này.</p>
              <p className="text-xs">
                Khi các tiệc cưới được xác nhận, thực đơn được đặt nhiều nhất sẽ tự động hiển thị ở đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
