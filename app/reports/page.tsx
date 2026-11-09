import type { Metadata } from 'next';
import { ManagementReportsPage } from '../../src/features/identity-access/reports-page';

export const metadata: Metadata = { title: 'Báo cáo' };

export default function ReportsPage() {
  return <ManagementReportsPage />;
}
