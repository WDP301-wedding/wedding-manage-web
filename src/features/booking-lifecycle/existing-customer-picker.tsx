'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
          ? 'Không tìm thấy khách trong hồ sơ bạn quản lý. Có thể nhập thông tin khách mới bên dưới.'
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
    <article className="booking-card">
      <h2>Khách cũ đặt thêm tiệc?</h2>
      <p>
        Tìm trong hồ sơ bạn quản lý để dùng lại tên và email. Mỗi tiệc có hồ sơ tư vấn riêng; không
        thay đổi tiệc trước.
      </p>
      <form onSubmit={(event) => void search(event)}>
        <label>
          Tìm khách theo tên, email hoặc số điện thoại
          <input
            value={query}
            minLength={2}
            maxLength={120}
            disabled={disabled || pending}
            onChange={(event) => {
              setQuery(event.target.value);
              setCustomers([]);
              setNotice(null);
            }}
          />
        </label>
        <button disabled={disabled || pending || query.trim().length < 2} type="submit">
          {pending ? 'Đang tìm…' : 'Tìm khách đã có'}
        </button>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      {customers.length ? (
        <ul aria-label="Khách đã có">
          {customers.map((customer) => (
            <li key={customer.consultationId}>
              <strong>{customer.displayName}</strong> · {customer.email}{' '}
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChoose(customer);
                  setCustomers([]);
                  setQuery('');
                }}
              >
                Dùng thông tin cho tiệc mới
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
