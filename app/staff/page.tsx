import type { Metadata } from 'next';
import { StaffOperationsPage } from '@/src/features/staff-operations/pages/staff-page';

export const metadata: Metadata = { title: 'Nhân sự' };

export default function StaffPage() {
  return <StaffOperationsPage />;
}
