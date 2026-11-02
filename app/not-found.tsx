import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '../src/components/ui/button';
import { StatusPage } from '../src/design-system/status-page';

export const metadata: Metadata = { title: 'Không tìm thấy trang' };

export default function NotFound() {
  return (
    <StatusPage
      title="Không tìm thấy trang"
      description="Đường dẫn có thể đã cũ hoặc gõ sai. Hãy quay lại trang tổng quan để tiếp tục."
    >
      <Link className={buttonVariants()} href="/">
        Về tổng quan
      </Link>
    </StatusPage>
  );
}
