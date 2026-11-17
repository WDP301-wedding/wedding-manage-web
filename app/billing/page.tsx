import type { Metadata } from 'next';
import { ManagementFinancePage } from '@/src/features/finance/pages/finance-page';

export const metadata: Metadata = { title: 'Quản lý thanh toán' };

export default function BillingPage() {
  return <ManagementFinancePage initialTab="payments" />;
}
