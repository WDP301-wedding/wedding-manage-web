'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button, buttonVariants } from '../../components/ui/button';
import { ApiServiceError } from '../../lib/api/axios-client';
import { contractService, type ContractRevisionItem } from '../../services/contract.service';

export function ContractPdfDialog({
  bookingId,
  revision,
  onClose,
}: Readonly<{
  bookingId: string;
  revision: ContractRevisionItem;
  onClose: () => void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [result, setResult] = useState<{ url: string } | { error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const revisionId = revision.revisionId;
  const approved = revision.state === 'APPROVED';

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void contractService
      .downloadContractPdf(bookingId, revisionId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        if (blob.type.split(';', 1)[0] !== 'application/pdf')
          throw new Error('Tệp PDF chưa sẵn sàng.');
        url = URL.createObjectURL(blob);
        setResult({ url });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            error: error instanceof ApiServiceError ? error.message : 'Không thể mở PDF hợp đồng.',
          });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [bookingId, revisionId, attempt]);

  const url = result && 'url' in result ? result.url : null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto h-[min(90dvh,1000px)] w-[min(1050px,calc(100vw-24px))] max-w-none rounded-xl border border-border bg-card p-0 text-foreground shadow-hy-2 backdrop:bg-hy-ink/40"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 id={title} className="text-lg font-semibold">
              {approved ? 'Hợp đồng đã duyệt' : 'Bản xem trước hợp đồng'} · Bản{' '}
              {revision.revisionNumber}
            </h3>
            <p className="text-xs text-muted-foreground">
              {approved
                ? revision.document.standardTerms
                  ? 'Tải tệp để in và ký tay ở Điều 10.'
                  : 'Xem và tải tệp PDF đã lưu để đối chiếu.'
                : 'Kiểm tra nội dung và bảng giá của phiên bản này.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {url ? (
              <>
                <a
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở trong tab mới
                </a>
                <a
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  href={url}
                  download={`hop-dong-ban-${revision.revisionNumber}.pdf`}
                >
                  {approved ? 'Tải bản chính thức' : 'Tải bản xem trước'}
                </a>
              </>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </header>
        {url ? (
          <iframe
            title="Bản xem hợp đồng PDF"
            src={url}
            className="min-h-0 w-full flex-1 border-0"
          />
        ) : result && 'error' in result ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <p>{result.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : (
          <p role="status" className="p-4 text-sm">
            Đang mở hợp đồng PDF…
          </p>
        )}
      </div>
    </dialog>
  );
}
