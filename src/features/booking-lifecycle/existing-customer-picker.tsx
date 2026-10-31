'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { Authorize, ConsultationCustomer, ManagementBookingGateway } from './booking-api';

export function ExistingCustomerPicker({
  authorize,
  gateway,
  disabled,
  onChoose,
}: Readonly<{
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  disabled: boolean;
  onChoose: (customer: ConsultationCustomer) => void;
}>) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<readonly ConsultationCustomer[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || pending || query.trim().length < 2) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setNotice(null);
    setCustomers([]);
    try {
      const items = await authorize((token) =>
        gateway.searchCustomers(token, query.trim(), controller.signal),
      );
      if (controller.signal.aborted) return;
      setCustomers(items);
      setNotice(
        items.length === 0
          ? 'Không tìm thấy khách trong hồ sơ bạn quản lý. Có thể nhập thông tin khách mới bên cạnh.'
          : null,
      );
    } catch {
      if (!controller.signal.aborted)
        setNotice('Chưa tìm được khách. Hãy thử lại; không cần tạo lại tài khoản.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-hy-1">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Khách cũ đặt thêm tiệc?</h3>
        <p className="text-xs text-muted-foreground">
          Tìm trong hồ sơ bạn quản lý để dùng lại thông tin. Mỗi tiệc có hồ sơ riêng; không thay đổi
          tiệc trước.
        </p>
      </div>

      <form onSubmit={(event) => void search(event)} className="flex flex-col gap-3">
        <label
          className="flex flex-col gap-1 text-xs font-semibold"
          htmlFor="customer-search-query"
        >
          <span>Tìm khách theo tên, email hoặc số điện thoại</span>
          <Input
            id="customer-search-query"
            className="font-normal"
            value={query}
            minLength={2}
            maxLength={120}
            placeholder="Nhập tên, email hoặc SĐT..."
            aria-label="Tìm khách theo tên, email hoặc số điện thoại"
            disabled={disabled || pending}
            onChange={(event) => {
              setQuery(event.target.value);
              setCustomers([]);
              setNotice(null);
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={disabled || pending || query.trim().length < 2}
          type="submit"
        >
          {pending ? 'Đang tìm…' : 'Tìm khách đã có'}
        </Button>
      </form>

      {notice ? (
        <p className="rounded-lg bg-hy-info-bg px-4 py-3 text-xs text-hy-info" role="status">
          {notice}
        </p>
      ) : null}

      {customers.length ? (
        <ul aria-label="Khách đã có" className="overflow-hidden rounded-lg border border-border">
          {customers.map((customer) => (
            <li
              key={customer.consultationId}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <strong className="font-semibold">{customer.displayName}</strong> ·{' '}
                <span className="text-muted-foreground">{customer.email}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onChoose(customer);
                  setCustomers([]);
                  setQuery('');
                }}
              >
                Dùng thông tin cho tiệc mới
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
