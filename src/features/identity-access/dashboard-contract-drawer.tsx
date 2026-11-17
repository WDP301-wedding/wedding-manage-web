'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  X,
  CreditCard,
  FileCheck,
  Phone,
  MapPin,
  Calendar,
  Download,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { NavigationBooking } from '../../services/booking-navigation.service';
import {
  contractService,
  type ContractListData,
  type ContractRevisionItem,
} from '../../services/contract.service';
import { formatDate } from '../booking-lifecycle/booking-helpers';
import { formatVnd } from '../../lib/formatters';
import { describeApiError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/notifications';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';

export interface DashboardContractDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking: NavigationBooking | null;
}

export function DashboardContractDrawer({
  isOpen,
  onClose,
  booking,
}: Readonly<DashboardContractDrawerProps>) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [contractsData, setContractsData] = useState<ContractListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !booking) {
      setContractsData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void contractService
      .getContracts(booking.bookingId)
      .then((data) => {
        if (!active) return;
        setContractsData(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(describeApiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const coupleName =
    [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
    booking.customerName ||
    booking.alias ||
    'Chưa cập nhật tên';

  const contractCode = booking.bookingCode || 'Chưa cấp mã';
  const phone = booking.phone || 'Chưa có SĐT';
  const hallName = booking.hallNameSnapshot || 'Chưa gán sảnh';
  const eventDateText = `${formatDate(booking.eventDate)} • ${booking.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối'}`;

  const latestRevision: ContractRevisionItem | undefined = contractsData?.revisions[0];

  const handleDownloadPdf = async () => {
    if (!latestRevision) return;
    setDownloadingPdf(true);
    try {
      const blob = await contractService.downloadContractPdf(
        booking.bookingId,
        latestRevision.revisionId,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hop-dong-${contractCode}-lan-${latestRevision.revisionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success('Đã tải tệp PDF hợp đồng chính thức.');
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Không thể tải tệp PDF hợp đồng lúc này.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Hồ sơ hợp đồng thương mại"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-hy-ink/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-card shadow-hy-2 motion-safe:animate-in motion-safe:slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                HỒ SƠ HỢP ĐỒNG THƯƠNG MẠI
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Hợp Đồng #{contractCode}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Đóng bảng hồ sơ"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Couple & Venue Meta Summary */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              THÔNG TIN ĐẠI DIỆN HÔN LỄ
            </span>
            <div className="flex flex-col gap-1">
              <strong className="text-lg font-bold text-foreground">{coupleName}</strong>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-primary" />
                  {phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-primary" />
                  {hallName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3 text-primary" />
                  {eventDateText}
                </span>
              </div>
            </div>
          </div>

          {/* Real Contract State */}
          {loading ? (
            <div className="flex flex-col gap-5" aria-busy="true" aria-label="Đang tải thông tin hợp đồng">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-hy-error-bg p-6 text-hy-error">
              <AlertCircle className="size-6" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : latestRevision ? (
            <div className="flex flex-col gap-5">
              {/* Financial & Scale Snapshot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase">
                    TỔNG GIÁ TRỊ HỢP ĐỒNG
                  </span>
                  <strong className="text-lg font-bold text-foreground tabular-nums sm:text-xl">
                    {formatVnd(latestRevision.document.contractTotalVnd)}
                  </strong>
                  <span className="text-2xs text-muted-foreground">Đã bao gồm VAT &amp; Phí</span>
                </div>

                <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-hy-wine-soft/50 p-4">
                  <span className="text-2xs font-semibold text-primary uppercase">
                    TIỀN CỌC THEO QUY ĐỊNH (30%)
                  </span>
                  <strong className="text-lg font-bold text-primary tabular-nums sm:text-xl">
                    {formatVnd(latestRevision.document.depositAmountVnd)}
                  </strong>
                  <span className="text-2xs text-muted-foreground">Mức cọc tối thiểu giữ sảnh</span>
                </div>
              </div>

              {/* Revision Meta */}
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Phiên bản hợp đồng:</span>
                  <strong className="font-semibold text-foreground">
                    Lần sửa đổi #{latestRevision.revisionNumber}
                  </strong>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Trạng thái hợp đồng:</span>
                  <Badge variant={latestRevision.state === 'APPROVED' ? 'success' : 'warning'}>
                    {latestRevision.state === 'APPROVED'
                      ? 'Đã duyệt song phương'
                      : latestRevision.state === 'AWAITING_APPROVAL'
                      ? 'Đang chờ ký duyệt'
                      : 'Bản thảo đang soạn'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Quy mô tiệc cam kết:</span>
                  <span className="font-medium text-foreground">
                    <strong>{latestRevision.document.tableCount}</strong> bàn chính thức (
                    <strong>{latestRevision.document.planningHeadcount}</strong> khách)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Chữ ký đại diện:</span>
                  <span className="font-medium text-foreground">
                    {latestRevision.approvals.some((a) => a.party === 'MANAGER') ? '✓ Quản lý' : 'Chờ quản lý'}
                    {' • '}
                    {latestRevision.approvals.some((a) => a.party === 'COUPLE') ? '✓ Khách hàng' : 'Chờ khách hàng'}
                  </span>
                </div>
              </div>

              {/* PDF Actions */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Văn Bản PDF Chính Thức</span>
                  </div>
                  <span className="text-2xs text-muted-foreground">Lưu trữ điện tử 256-bit</span>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Bản in hoàn chỉnh có điều khoản chi tiết, bảng kê thực đơn và vị trí ký tay song phương.
                </p>
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={downloadingPdf}
                  className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                >
                  <Download className="size-3.5" />
                  {downloadingPdf ? 'Đang tạo tệp PDF…' : 'Tải Bản In Hợp Đồng (PDF)'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
              <FileCheck className="size-8 text-muted-foreground/60" />
              <p>Hồ sơ tiệc này chưa tạo bản thảo hợp đồng thương mại.</p>
              <Link
                href={`/bookings?bookingId=${booking.bookingId}&tab=manage`}
                className="font-semibold text-primary hover:underline"
              >
                Soạn thảo hợp đồng mới ngay →
              </Link>
            </div>
          )}
        </div>

        {/* Footer Navigation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-4 sm:p-6">
          <Link
            href={`/billing?bookingId=${booking.bookingId}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-hy-wine-pressed"
          >
            <CreditCard className="size-4" />
            Cổng Quyết Toán &amp; Thu Cọc
          </Link>

          <Link
            href={`/bookings?bookingId=${booking.bookingId}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-hy-outline-strong hover:bg-muted"
          >
            Mở Không Gian Đặt Tiệc
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
