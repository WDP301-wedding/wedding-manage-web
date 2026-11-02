'use client';

import PageError from './error';
import './globals.css';

export default function GlobalError(
  props: Readonly<{ error: Error & { digest?: string }; retry: () => void }>,
) {
  return (
    <html lang="vi">
      <body>
        <title>Chưa thể hiển thị trang | Hỷ Yến Quản trị</title>
        <PageError {...props} />
      </body>
    </html>
  );
}
