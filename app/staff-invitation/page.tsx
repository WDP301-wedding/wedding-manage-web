import type { Metadata } from 'next';
import { StaffInvitationPage } from '../../src/features/identity-access/staff-invitation-page';

export const metadata: Metadata = {
  title: 'Thiết lập tài khoản nhân viên',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <StaffInvitationPage />;
}
