'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { axiosApiClient } from '../../lib/api/axios-client';
import { readPublicEnv } from '../../lib/env';

type Authorize = <T>(work: (token: string) => Promise<T>) => Promise<T>;

export function RetainedPrintPreview({
  bookingId,
  printableRevisionId,
  title,
  authorize,
}: Readonly<{
  bookingId: string;
  printableRevisionId: string;
  title: string;
  authorize?: Authorize;
}>) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  async function load() {
    if (controller.current) return;
    const operation = new AbortController();
    controller.current = operation;
    setBusy(true);
    setError(null);
    const path = `/bookings/${encodeURIComponent(bookingId)}/printable-revisions/${encodeURIComponent(printableRevisionId)}/file`;
    try {
      const blob = authorize
        ? await authorize(async (token) => {
            const response = await fetch(
              readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') + path,
              {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
                signal: AbortSignal.any([operation.signal, AbortSignal.timeout(30000)]),
              },
            );
            if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf'))
              throw new Error('Không thể tải bản in đã chốt. Vui lòng thử lại.');
            return response.blob();
          })
        : (
            await axiosApiClient.get<Blob>(path, {
              responseType: 'blob',
              signal: operation.signal,
              timeout: 30000,
            })
          ).data;
      if (!blob.type.includes('application/pdf'))
        throw new Error('Bản in trả về không đúng định dạng PDF.');
      if (!operation.signal.aborted) setUrl(URL.createObjectURL(blob));
    } catch (cause) {
      if (!operation.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Không thể tải bản in.');
    } finally {
      if (!operation.signal.aborted) {
        controller.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <strong className="break-words text-sm font-semibold">{title}</strong>
      <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
        {busy ? 'Đang tải bản in…' : `Xem bản in: ${title}`}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {url ? (
        <>
          <iframe
            title={`Bản in: ${title}`}
            src={`${url}#view=FitH`}
            className="h-[28rem] w-full rounded-lg border border-border"
          />
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Mở bản in: {title}
          </a>
          <a
            href={url}
            download={`ban-in-${printableRevisionId}.pdf`}
            className="text-sm text-primary underline"
          >
            Tải PDF: {title}
          </a>
        </>
      ) : null}
    </div>
  );
}
