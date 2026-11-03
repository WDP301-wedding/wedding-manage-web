'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { archiveRead, archivePageSchema, archiveDetailSchema, billingSchema } from './archive-api';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { formatDate } from '../booking-lifecycle/booking-helpers';
import { z } from 'zod';
const date = (value: string) => formatDate(value);
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const button =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40';
export function BookingArchive({ finance }: Readonly<{ finance?: ReactNode }>) {
  const rawId = useSearchParams().get('bookingId');
  const id = rawId && z.uuid().safeParse(rawId).success ? rawId : null;
  const [query, setQuery] = useState(''),
    [draft, setDraft] = useState(''),
    [page, setPage] = useState(1);
  const scope = JSON.stringify([query, page]);
  const [list, setList] = useState<{
      scope: string;
      data: z.infer<typeof archivePageSchema>;
    } | null>(null),
    [detail, setDetail] = useState<z.infer<typeof archiveDetailSchema> | null>(null),
    [error, setError] = useState<string | null>(null);
  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const data = await archiveRead('/booking-archive', archivePageSchema, {
          q: query,
          page,
          pageSize: 10,
        });
        if (isCurrent()) {
          setList({ scope, data });
          setError(null);
        }
      } catch (e) {
        if (isCurrent()) setError(e instanceof Error ? e.message : 'Không tải được tiệc đã hủy.');
      }
    },
    { scope: 'archive:' + scope, initial: true, types: ['booking.updated'] },
  );
  useLiveRefresh(
    async (isCurrent) => {
      if (!id) return;
      try {
        const data = await archiveRead(`/bookings/${id}/archive`, archiveDetailSchema);
        if (isCurrent()) {
          setDetail(data);
          setError(null);
        }
      } catch (e) {
        if (isCurrent()) {
          setDetail(null);
          setError(e instanceof Error ? e.message : 'Không tải được hồ sơ đã hủy.');
        }
      }
    },
    {
      scope: 'archive-detail:' + id,
      bookingId: id,
      initial: true,
      enabled: Boolean(id),
      types: ['booking.updated', 'billing.updated'],
    },
  );
  const data = list?.scope === scope ? list.data : null,
    current = detail?.booking.bookingId === id ? detail : null;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Tiệc đã hủy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hồ sơ được giữ riêng để tra cứu và đối chiếu. Không tiếp tục đặt tiệc hoặc sửa các nội
          dung đã lưu.
        </p>
      </header>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(draft.trim());
          setPage(1);
        }}
      >
        <input
          aria-label="Tìm tiệc đã hủy"
          value={draft}
          maxLength={120}
          placeholder="Mã HY, tên tiệc, khách hàng…"
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <button type="submit" className={button}>
          Tìm kiếm
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void live.refresh()}>
            Thử lại
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">Đang tải danh sách…</p>
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.items.map((row) => (
              <li key={row.bookingId}>
                <Link
                  className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-sm hover:border-primary"
                  href={'/cancelled-bookings' + `?bookingId=${row.bookingId}`}
                  aria-current={row.bookingId === id ? 'true' : undefined}
                >
                  <strong>
                    {row.bookingCode ?? 'Hồ sơ tiệc'} ·{' '}
                    {row.alias ?? row.customerName ?? row.hallNameSnapshot}
                  </strong>
                  <span>
                    {date(row.eventDate)} · {row.hallNameSnapshot}
                  </span>
                  <span className="text-muted-foreground">
                    Đã hủy{row.cancelledAt ? ` ngày ${date(row.cancelledAt)}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {data.total === 0 && <p>Không có tiệc đã hủy phù hợp.</p>}
          <nav
            aria-label="Phân trang tiệc đã hủy"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <span>
              {data.total} hồ sơ · Trang {data.page}/{Math.max(1, data.totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                className={button}
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                Trang trước
              </button>
              <button
                className={button}
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                Trang sau
              </button>
            </div>
          </nav>
        </>
      )}
      {current && (
        <section
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
          aria-label="Chi tiết hồ sơ đã hủy"
        >
          <h2 className="text-lg font-semibold">
            {current.booking.bookingCode} · {current.booking.alias ?? current.booking.customerName}
          </h2>
          <p className="text-sm">
            Ngày tiệc: {date(current.booking.eventDate)} · {current.booking.hallNameSnapshot}
          </p>
          <p className="text-sm">
            Lý do hủy:{' '}
            {current.cancellationReason ?? 'Không có lý do hủy được lưu trong yêu cầu phê duyệt.'}
          </p>
          {current.contract ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Giá trị hợp đồng lưu trữ</dt>
                  <dd className="font-semibold">{money(current.contract.totalVnd)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Cọc theo hợp đồng lưu trữ</dt>
                  <dd className="font-semibold">{money(current.contract.depositVnd)}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Các số trên là thông tin hợp đồng lưu trữ, không phải yêu cầu thanh toán mới.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tiệc này chưa có hợp đồng thương mại được lưu.
            </p>
          )}
          {finance ?? <ArchivedPayments bookingId={current.booking.bookingId} />}
        </section>
      )}
    </div>
  );
}
function ArchivedPayments({ bookingId }: Readonly<{ bookingId: string }>) {
  const [result, setResult] = useState<{
      bookingId: string;
      data: z.infer<typeof billingSchema>;
    } | null>(null),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const current = result?.bookingId === bookingId ? result.data : null;
  const load = async (more = false) => {
    setPending(true);
    try {
      const data = await archiveRead(
        `/bookings/${bookingId}/billing`,
        billingSchema,
        more && current?.nextCursor
          ? {
              cursor: current.nextCursor,
              throughBillingRevision: current.billingRevision,
              limit: 25,
            }
          : { limit: 25 },
      );
      setResult({
        bookingId,
        data: more && current ? { ...data, history: [...current.history, ...data.history] } : data,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không có quyền đọc lịch sử thanh toán.');
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Lịch sử thanh toán</h3>
      <p className="text-xs text-muted-foreground">
        Chỉ xem các khoản thu và hoàn đã ghi nhận; hồ sơ chưa có quyền thanh toán có thể không mở
        được mục này.
      </p>
      <button type="button" className={button} disabled={pending} onClick={() => void load()}>
        Xem / làm mới lịch sử
      </button>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {current && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt>Đã thu</dt>
              <dd>{money(current.totals.paidVnd ?? 0)}</dd>
            </div>
            <div>
              <dt>Đã hoàn</dt>
              <dd>{money(current.totals.refundedVnd ?? 0)}</dd>
            </div>
          </dl>
          <ul className="divide-y divide-border">
            {current.history
              .filter((h) => h.kind === 'PAYMENT' || h.kind === 'REFUND')
              .map((h) => (
                <li
                  key={h.ledgerEntryId}
                  className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    {h.kind === 'PAYMENT' ? 'Khoản thu' : 'Khoản hoàn'} · {date(h.occurredAt)}
                  </span>
                  <strong>{money(h.amountVnd)}</strong>
                </li>
              ))}
          </ul>
          {current.nextCursor && (
            <button className={button} disabled={pending} onClick={() => void load(true)}>
              Tải thêm giao dịch
            </button>
          )}
        </>
      )}
    </section>
  );
}
