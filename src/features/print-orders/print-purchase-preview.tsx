'use client';
import { useEffect, useRef, useState } from 'react';
import { readPublicEnv } from '../../lib/env';
import { Button } from '../../components/ui/button';
import type { PrintOrderView } from './print-orders-types';
export function PrintPurchasePreview({
  order,
  authorize,
}: Readonly<{
  order: PrintOrderView;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
}>) {
  const [url, setUrl] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const printableId = order.lines[0]?.printableRevisionId;
  async function load() {
    if (!printableId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await authorize(async (token) => {
        const response = await fetch(
          readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') +
            `/bookings/${order.bookingId}/printable-revisions/${printableId}/file`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(30000),
          },
        );
        if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf'))
          throw new Error('Không thể tải bản in đã xác nhận. Vui lòng thử lại trước khi duyệt.');
        return response.blob();
      });
      if (active.current) setUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      if (active.current) setError(err instanceof Error ? err.message : 'Không thể tải bản in.');
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">Bản in Couple đã xác nhận</h3>
      <p className="text-sm text-muted-foreground">
        Kiểm tra đúng nội dung trước khi duyệt. Bản này giữ nguyên kể cả khi khách tiếp tục sửa
        thiệp điện tử.
      </p>
      <Button onClick={() => void load()} disabled={busy || !printableId}>
        {busy ? 'Đang tải…' : 'Xem bản in đã xác nhận'}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
      {url ? (
        <>
          <iframe title="Bản in đã xác nhận" src={url} width="100%" height="460" />
          <a href={url} download="ban-in-da-xac-nhan.pdf">
            Tải PDF để kiểm tra
          </a>
        </>
      ) : null}
    </section>
  );
}
