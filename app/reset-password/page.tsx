import type { Metadata } from 'next';
import { ManagementIdentityPage } from '../../src/features/identity-access/identity-page';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu' };
export default function Page() {
  return <ManagementIdentityPage />;
}
