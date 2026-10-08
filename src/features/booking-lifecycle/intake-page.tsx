'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createApiClient, ApiClientError } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';

const session = new ManagementIdentitySession(createIdentityApi());
let resolvedApi: ReturnType<typeof createApiClient> | undefined;
const getApi = () => (resolvedApi ??= createApiClient());
type Queue = components['schemas']['ConsultationRequestList'];
type Item = Queue['data'][number];

export function ConsultationRequestsPage() {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [access, setAccess] = useState<'loading' | 'manager' | 'denied'>('loading');
  const [queue, setQueue] = useState<Queue | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async (cursor?: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await session.authorize((token) =>
        getApi().GET('/management/consultation-requests', {
          headers: { Authorization: `Bearer ${token}` },
          params: { query: { limit: 20, ...(cursor ? { cursor } : {}) } },
        }),
      );
      if (!result.data) throw new Error('Không tải được danh sách.');
      const page: Queue = {
        ...result.data,
        data: Array.from(result.data.data, (item) => ({ ...item })),
      };
      setQueue((previous) =>
        cursor && previous ? { ...page, data: [...previous.data, ...page.data] } : page,
      );
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không tải được yêu cầu tư vấn. Hãy thử lại.');
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((snapshot) => {
        if (!active) return;
        setSnapshot(snapshot);
        if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager') {
          setAccess('denied');
          return;
        }
        setAccess('manager');
        void load();
      })
      .catch(() => {
        if (active) setAccess('denied');
      });
    return () => {
      active = false;
    };
  }, [load]);
  async function act(item: Item, action: 'conversion' | 'closure') {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await session.authorize((token) =>
        action === 'conversion'
          ? getApi().POST('/management/consultation-requests/{id}/conversion', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            })
          : getApi().POST('/management/consultation-requests/{id}/closure', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            }),
      );
      setNotice(
        action === 'conversion'
          ? 'Đã mở hồ sơ tư vấn. Chọn Tiếp tục đặt tiệc để gửi lời mời và chuẩn bị đề xuất.'
          : 'Đã đóng yêu cầu tư vấn.',
      );
      await load();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không hoàn tất được thao tác. Tải lại để kiểm tra trạng thái mới nhất.');
    } finally {
      setPending(false);
    }
  }
  const logout = () => {
    setPending(true);
    setError(null);
    setNotice(null);
    void session
      .logout()
      .catch(() =>
        setError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setQueue(null);
        setAccess('denied');
        setPending(false);
      });
  };
  return (
    <OperationsShell
      activePage="consultations"
      contentId="consultation-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={pending}
    >
      <main className="booking-shell" id="consultation-main">
        <header className="booking-header">
          <div>
            <p className="section-kicker">Wedding Estate · Operations</p>
            <h1>Yêu cầu tư vấn</h1>
            <p>Tiếp nhận lời nhắn và mở hồ sơ để cùng khách hàng chuẩn bị buổi tiệc.</p>
          </div>
        </header>
        {access === 'loading' && <p role="status">Đang xác minh quyền quản lý…</p>}
        {access === 'denied' && (
          <section>
            <h2>Cần tài khoản Quản lý</h2>
            <Link href="/">Đăng nhập để tiếp tục</Link>
          </section>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            {access === 'manager' && (
              <button type="button" disabled={pending} onClick={() => void load()}>
                Tải lại
              </button>
            )}
          </div>
        )}
        {access === 'manager' && (
          <>
            {pending && <p role="status">Đang xử lý…</p>}
            {queue?.data.length === 0 && (
              <section>
                <h2>Chưa có yêu cầu tư vấn</h2>
                <p>Yêu cầu được gửi từ trang công khai sẽ xuất hiện tại đây.</p>
              </section>
            )}
            <div className="intake-list">
              {queue?.data.map((item) => (
                <article className="intake-item" key={item.id}>
                  <div>
                    <p className="section-kicker">
                      {
                        { NEW: 'Cần tiếp nhận', CONVERTED: 'Đã mở hồ sơ', CLOSED: 'Đã đóng' }[
                          item.status
                        ]
                      }
                    </p>
                    <h2>{item.displayName}</h2>
                    <p>
                      <a href={`mailto:${item.email}`}>{item.email}</a>
                      {item.phone && (
                        <>
                          {' '}
                          · <a href={`tel:${item.phone}`}>{item.phone}</a>
                        </>
                      )}
                    </p>
                  </div>
                  <dl>
                    <div>
                      <dt>Ngày mong muốn</dt>
                      <dd>{item.preferredDate ?? 'Chưa chọn'}</dd>
                    </div>
                    <div>
                      <dt>Số khách dự kiến</dt>
                      <dd>{item.expectedGuests ?? 'Chưa cung cấp'}</dd>
                    </div>
                    <div>
                      <dt>Đã nhận</dt>
                      <dd>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</dd>
                    </div>
                  </dl>
                  {item.message && <p className="intake-message">{item.message}</p>}
                  {item.status === 'NEW' && (
                    <div className="intake-actions">
                      <button
                        className="booking-primary-link"
                        type="button"
                        disabled={pending}
                        onClick={() => void act(item, 'conversion')}
                      >
                        Mở hồ sơ tư vấn
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void act(item, 'closure')}
                      >
                        Đóng yêu cầu
                      </button>
                    </div>
                  )}
                  {item.status === 'CONVERTED' && item.consultationId && (
                    <Link
                      className="booking-primary-link"
                      href={`/bookings?consultationId=${item.consultationId}&consultationRevision=${item.consultationRevision}`}
                    >
                      Tiếp tục đặt tiệc
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {queue?.nextCursor && (
              <button type="button" disabled={pending} onClick={() => void load(queue.nextCursor!)}>
                Xem thêm yêu cầu
              </button>
            )}
          </>
        )}
      </main>
    </OperationsShell>
  );
}
