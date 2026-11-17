import type { Metadata } from 'next';
import { ManagementFinancePage } from '@/src/features/finance/pages/finance-page';

export const metadata: Metadata = { title: 'Tài chính' };

export default function FinancePage() {
  return <ManagementFinancePage />;
}
