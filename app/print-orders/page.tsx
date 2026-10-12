import { ManagementPrintOrdersPage } from '../../src/features/print-orders/print-orders-page';

interface PageProps {
  searchParams?: Promise<{ demo?: string; fixtures?: string }>;
}

export default async function PrintOrdersPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const isDemo = params.demo === '1' || params.fixtures === '1';
  return <ManagementPrintOrdersPage useFixtures={isDemo} />;
}
