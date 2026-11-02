import type { Metadata } from 'next';
import { ManagementBillingPage } from '../../src/features/payments-billing/billing-page';

export const metadata: Metadata = { title: 'Quản lý thanh toán' };

export default function BillingPage() {
  return <ManagementBillingPage />;
}
