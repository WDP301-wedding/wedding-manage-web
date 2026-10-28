'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Authorize, ConsultationCustomer, ManagementBookingGateway } from './booking-api';
import styles from './existing-customer-picker.module.css';

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
    <article className={styles.pickerCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>Khách cũ đặt thêm tiệc?</h3>
        <p className={styles.desc}>
          Tìm trong hồ sơ bạn quản lý để dùng lại thông tin. Mỗi tiệc có hồ sơ riêng; không thay đổi tiệc trước.
        </p>
      </div>

      <form onSubmit={(event) => void search(event)} className={styles.searchForm}>
        <label className={styles.inputLabel} htmlFor="customer-search-query">
          <span className={styles.labelText}>Tìm khách theo tên, email hoặc số điện thoại</span>
          <input
            id="customer-search-query"
            className={styles.input}
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
        <button
          className={styles.searchBtn}
          disabled={disabled || pending || query.trim().length < 2}
          type="submit"
        >
          {pending ? 'Đang tìm…' : 'Tìm khách đã có'}
        </button>
      </form>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {customers.length ? (
        <ul className={styles.resultsList} aria-label="Khách đã có">
          {customers.map((customer) => (
            <li key={customer.consultationId} className={styles.resultItem}>
              <div className={styles.resultInfo}>
                <strong>{customer.displayName}</strong> · <span>{customer.email}</span>
              </div>
              <button
                type="button"
                className={styles.chooseBtn}
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
