import type { Metadata } from 'next';
import { ConsultationRequestsPage } from '../../src/features/booking-lifecycle/intake-page';

export const metadata: Metadata = { title: 'Yêu cầu tư vấn' };
export default function Page() {
  return <ConsultationRequestsPage />;
}
