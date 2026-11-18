'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { contractService } from '@/src/services/bookings/contract.service';
import { lineDescription } from '@/src/features/booking-lifecycle/components/contracts/contract-lines-table';
import { formatUnitLabel } from '@/src/lib/formatting/formatters';

interface DisplayOffering {
  key: string;
  category: 'MENU' | 'SERVICE' | 'PRINT';
  name: string;
  description: string;
  quantity: number;
  unit: string;
}

export function RealMenuView({
  workspace,
  booking,
  loading = false,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
  loading?: boolean;
}>) {
  const [contractOfferings, setContractOfferings] = useState<readonly DisplayOffering[]>([]);
  const [loadingContract, setLoadingContract] = useState(false);

  const hasWorkspaceOfferings = (workspace?.operations.offerings.length ?? 0) > 0;

  // For bookings before CONFIRMED/COMPLETED (where staffWorkspace isn't active), read real contract lines
  useEffect(() => {
    if (hasWorkspaceOfferings) {
      setContractOfferings([]);
      return;
    }
    let active = true;
    setLoadingContract(true);
    void contractService
      .getContracts(booking.bookingId)
      .then((res) => {
        if (!active) return;
        const latest =
          res.revisions.find((r) => r.state === 'APPROVED') ?? res.revisions[0] ?? null;
        if (!latest) {
          setContractOfferings([]);
          return;
        }
        setContractOfferings(
          latest.document.lines.map((line, index) => ({
            key: `${line.sourceId}-${index}`,
            category: line.category,
            name: line.name,
            description: line.description ? lineDescription(line.description) : '',
            quantity: line.quantity,
            unit: line.unit,
          })),
        );
      })
      .catch(() => {
        if (active) setContractOfferings([]);
      })
      .finally(() => {
        if (active) setLoadingContract(false);
      });
    return () => {
      active = false;
    };
  }, [booking.bookingId, hasWorkspaceOfferings]);

  const allOfferings: readonly DisplayOffering[] = hasWorkspaceOfferings
    ? (workspace?.operations.offerings ?? []).map((o, idx) => ({
        key: `${o.category}-${o.name}-${idx}`,
        category: o.category,
        name: o.name,
        description: o.description,
        quantity: o.quantity,
        unit: o.unit,
      }))
    : contractOfferings;

  const menuItems = allOfferings.filter((o) => o.category === 'MENU');
  const serviceItems = allOfferings.filter((o) => o.category !== 'MENU');
  const isBusy = loading || (!hasWorkspaceOfferings && loadingContract);

  return (
    <div className="master-event-card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '18px',
          borderBottom: '1px solid var(--ck-border-base)',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="strip-sub-code">Thực Đơn &amp; Dịch Vụ Đã Đăng Ký</span>
          <h2
            style={{
              fontSize: '17.5px',
              fontWeight: 700,
              color: 'var(--ck-text-main)',
              marginTop: '3px',
            }}
          >
            {menuItems.length > 0
              ? menuItems.map((m) => m.name).join(' · ')
              : 'Hạng mục thực đơn & dịch vụ của tiệc'}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đồng bộ trực tiếp từ hợp đồng và phụ lục hiệu lực của tiệc #{booking.bookingCode || booking.bookingId.slice(0, 8)}
          </p>
        </div>

        <Link
          href={`/bookings?bookingId=${booking.bookingId}`}
          className="btn-action btn-action-secondary no-underline"
        >
          Xem hợp đồng &amp; phụ lục
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {isBusy ? (
        <div className="menu-catalog-grid" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="menu-course-card flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : allOfferings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">
            Chưa có gói thực đơn hoặc dịch vụ nào được ghi nhận cho tiệc này
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Khi thực đơn và các dịch vụ đi kèm được chọn trong hợp đồng, danh sách thật sẽ tự động
            hiển thị tại đây.
          </p>
          <Link
            href={`/bookings?bookingId=${booking.bookingId}`}
            className="btn-action btn-action-secondary mt-2 no-underline"
          >
            Mở hồ sơ tiệc
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {menuItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Gói thực đơn ({menuItems.length})
              </h3>
              <div className="menu-catalog-grid">
                {menuItems.map((item) => (
                  <div key={item.key} className="menu-course-card">
                    <div className="course-card-header">
                      <Badge variant="brand">Thực đơn</Badge>
                      <span className="solid-tag solid-tag-success tabular-nums">
                        {item.quantity.toLocaleString('vi-VN')} {formatUnitLabel(item.unit)}
                      </span>
                    </div>
                    <div className="dish-card-item">
                      <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground whitespace-pre-line">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {serviceItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Dịch vụ &amp; hạng mục đi kèm ({serviceItems.length})
              </h3>
              <div className="menu-catalog-grid">
                {serviceItems.map((item) => (
                  <div key={item.key} className="menu-course-card">
                    <div className="course-card-header">
                      <Badge variant={item.category === 'PRINT' ? 'info' : 'neutral'}>
                        {item.category === 'PRINT' ? 'Thiệp in' : 'Dịch vụ'}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        {item.quantity.toLocaleString('vi-VN')} {formatUnitLabel(item.unit)}
                      </span>
                    </div>
                    <div className="dish-card-item">
                      <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground whitespace-pre-line">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
