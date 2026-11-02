import type { Metadata } from 'next';
import { ManagementAccountPage } from '../../src/features/identity-access/account-page';

export const metadata: Metadata = { title: 'Tài khoản' };

export default function AccountPage() {
  return <ManagementAccountPage />;
}
