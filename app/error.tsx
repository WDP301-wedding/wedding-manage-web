'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '../src/components/ui/button';
import { StatusPage } from '../src/design-system/status-page';

export default function PageError({
  error,
  retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return (
    <StatusPage
      title="Chưa thể hiển thị trang này"
      description={
        <>
          Đã có sự cố khi tải nội dung. Hãy thử tải lại; nếu lỗi tiếp diễn, gửi mã sự cố cho nhóm kỹ
          thuật.
          {error.digest ? (
            <span className="mt-2 block">
              Mã sự cố: <code className="font-mono text-xs">{error.digest}</code>
            </span>
          ) : null}
        </>
      }
    >
      <Button onClick={() => retry()}>Thử tải lại</Button>
      <Link className={buttonVariants({ variant: 'outline' })} href="/">
        Về tổng quan
      </Link>
    </StatusPage>
  );
}
