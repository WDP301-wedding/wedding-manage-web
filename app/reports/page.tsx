import type { Metadata } from 'next';
import { ManagementFinancePage } from '@/src/features/finance/pages/finance-page';

export const metadata: Metadata = { title: 'Báo cáo' };

export default function ReportsPage() {
  return <ManagementFinancePage initialTab="revenue" />;
}
