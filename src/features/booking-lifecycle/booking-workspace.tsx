'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { addMyManagedBookingId, getMyManagedBookingIds } from '../identity-access/dashboard-live';
import { sharedManagementSession } from '../identity-access/session';
import { type BookingPrefill, errorMessage, type InviteLogEntry } from './booking-helpers';
import { BookingCreatePanel } from './booking-create-panel';
import { ConsultationPanel } from './consultation-panel';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { ProposalPanel } from './proposal-panel';

const session = sharedManagementSession;

export interface ManagementBookingWorkspaceProps {
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  autoLoadCatalog?: boolean | undefined;
  currentAccountId?: string | undefined;
  currentEmail?: string | undefined;
}

export function ManagementBookingWorkspace({
  authorize,
  gateway,
  autoLoadCatalog = false,
  currentAccountId,
  currentEmail,
}: Readonly<ManagementBookingWorkspaceProps>) {
  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBookingIds, setRecentBookingIds] = useState<string[]>([]);
  const [inviteLogs, setInviteLogs] = useState<readonly InviteLogEntry[]>([]);
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  useEffect(() => {
    setRecentBookingIds(getMyManagedBookingIds(currentAccountId));
  }, [currentAccountId]);

  const recordMyBooking = (id: string) => {
    addMyManagedBookingId(id, currentAccountId, currentEmail);
    setRecentBookingIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('consultationId');
    const revision = Number(params.get('consultationRevision'));
    if (
      id !== null &&
      /^[a-f0-9-]{36}$/iu.test(id) &&
      Number.isSafeInteger(revision) &&
      revision > 0
    ) {
      queueMicrotask(() => setConsultation({ id, revision }));
    }
    const bId = params.get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
      void run('load', () => authorize((token) => gateway.loadProposal(token, bId))).then(
        (result) => {
          if (result !== null) setProposal(result);
        },
      );
    }

    const dName = params.get('displayName') || undefined;
    const em = params.get('email') || undefined;
    const nt = params.get('note') || undefined;
    const pDate = params.get('preferredDate')?.slice(0, 10) || undefined;
    const expGuestsParam = params.get('expectedGuests');
    const expG =
      expGuestsParam && !Number.isNaN(Number(expGuestsParam)) ? Number(expGuestsParam) : undefined;
    const tCount = expG && expG > 0 ? Math.max(1, Math.ceil(expG / 10)) : undefined;

    if (dName || em || nt || pDate || expG) {
      setPrefill({
        displayName: dName,
        email: em,
        note: nt,
        eventDate: pDate,
        expectedGuests: expG,
        tableCount: tCount,
      });
    }

    if (!dName && !em && id) {
      void session
        .authorize((token) =>
          createApiClient().GET('/management/consultation-requests', {
            headers: { Authorization: `Bearer ${token}` },
            params: { query: { limit: 50 } },
          }),
        )
        .then((res) => {
          type RequestItem = components['schemas']['ConsultationRequestList']['data'][number];
          const list = (res.data as components['schemas']['ConsultationRequestList'] | undefined)
            ?.data;
          const match = list?.find((item: RequestItem) => item.consultationId === id);
          if (match) {
            const expGMatch = match.expectedGuests ?? undefined;
            const tCountMatch =
              expGMatch && expGMatch > 0 ? Math.max(1, Math.ceil(expGMatch / 10)) : undefined;
            setPrefill((prev) => ({
              displayName: prev.displayName ?? match.displayName,
              email: prev.email ?? match.email,
              note: prev.note ?? match.message ?? undefined,
              eventDate: prev.eventDate ?? match.preferredDate?.slice(0, 10),
              expectedGuests: prev.expectedGuests ?? expGMatch,
              tableCount: prev.tableCount ?? tCountMatch,
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const run = async <T,>(label: string, operation: () => Promise<T>): Promise<T | null> => {
    setPending(label);
    setMessage(null);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setProposal(null);
      }
      setError(errorMessage(caught, proposal?.proposal.shift));
      return null;
    } finally {
      setPending(null);
    }
  };

  const loadProposal = async (id: string) => {
    const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
    if (result !== null) {
      setProposal(result);
      recordMyBooking(id);
    }
  };

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  const resetConsultation = () => {
    setConsultation(null);
    setPrefill({});
    setMessage(
      'Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".',
    );
  };

  return (
    <main className="booking-shell" id="booking-main">
      <header className="booking-header">
        <div>
          <p className="section-kicker">Wedding Estate · Operations</p>
          <h1>Điều phối đặt tiệc</h1>
          <p>Tạo hồ sơ tư vấn, giữ lịch và kiểm soát vòng đời bằng revision từ máy chủ.</p>
        </div>
      </header>

      <div className="booking-live" aria-live="polite">
        {pending === null ? null : <span role="status">Đang xử lý yêu cầu…</span>}
        {message === null ? null : <span role="status">{message}</span>}
        {error === null ? null : <span role="alert">{error}</span>}
      </div>

      <section className="booking-grid" aria-label="Khởi tạo đặt tiệc">
        <ConsultationPanel
          disabled={pending !== null}
          consultation={consultation}
          prefill={prefill}
          logs={inviteLogs}
          onClearLogs={() => setInviteLogs([])}
          onReset={resetConsultation}
          onCreate={async (input) => {
            const result = await run('consultation', () =>
              authorize((token) => gateway.createConsultation(token, input)),
            );
            if (result !== null) {
              setConsultation({ id: result.consultationId, revision: result.revision });
              setPrefill((prev) => ({
                ...prev,
                displayName: input.displayName,
                email: input.intendedEmail,
                note: input.note,
              }));
              setMessage('Đã tạo hồ sơ tư vấn.');
            }
          }}
          onInvite={async () => {
            if (consultation === null) return;
            const now = new Date().toLocaleTimeString('vi-VN');
            const logId = crypto.randomUUID();
            console.log(`[Workspace Invitation] ${now} Bắt đầu gửi lời mời cộng tác:`, {
              consultationId: consultation.id,
              revision: consultation.revision,
            });
            setInviteLogs((prev) => [
              {
                id: logId,
                time: now,
                type: 'pending',
                message: 'Đang gửi yêu cầu mời cộng tác tới máy chủ...',
                consultationId: consultation.id,
              },
              ...prev,
            ]);

            setPending('invite');
            setMessage(null);
            setError(null);
            try {
              const res = await authorize((token) =>
                gateway.invite(token, {
                  consultationId: consultation.id,
                  expectedRevision: consultation.revision,
                }),
              );
              console.log(`[Workspace Invitation] ${now} Gửi lời mời thành công:`, res);
              setMessage('Đã yêu cầu gửi lời mời không gian cộng tác.');
              const invitationId = (res as { invitationId?: string } | undefined)?.invitationId;
              const isReplayed = (res as { replayed?: boolean } | undefined)?.replayed;
              setInviteLogs((prev) =>
                prev.map((item) =>
                  item.id === logId
                    ? {
                        ...item,
                        type: 'success',
                        message: 'Đã gửi lời mời thành công tới email của cặp đôi.',
                        invitationId: invitationId ?? 'Đã phát hành (ISSUED)',
                        details: isReplayed
                          ? 'Yêu cầu lặp lại (replayed) - lời mời đã được phát hành trước đó.'
                          : undefined,
                      }
                    : item,
                ),
              );
            } catch (caught) {
              const errText = errorMessage(caught, proposal?.proposal.shift);
              console.error(`[Workspace Invitation] ${now} Lỗi gửi lời mời:`, caught);
              setError(errText);
              setInviteLogs((prev) =>
                prev.map((item) =>
                  item.id === logId
                    ? {
                        ...item,
                        type: 'error',
                        message: `Gửi lời mời thất bại: ${errText}`,
                        details:
                          caught instanceof ApiClientError
                            ? `HTTP ${caught.status ?? 'N/A'} (${caught.code}): ${caught.message}`
                            : caught instanceof Error
                              ? caught.message
                              : String(caught),
                      }
                    : item,
                ),
              );
            } finally {
              setPending(null);
            }
          }}
        />
        <BookingCreatePanel
          disabled={pending !== null}
          consultation={consultation}
          prefill={prefill}
          gateway={gateway}
          authorize={authorize}
          run={run}
          autoLoadCatalog={autoLoadCatalog}
          onCreated={(result, consultationId) => {
            setBookingId(result.bookingId);
            setConsultation({ id: consultationId, revision: result.consultationRevision });
            setMessage('Đã tạo hồ sơ đặt tiệc.');
            void loadProposal(result.bookingId);
            recordMyBooking(result.bookingId);
          }}
          setMessage={setMessage}
          onValidationError={setError}
        />
      </section>

      <section className="booking-workspace" aria-labelledby="proposal-heading">
        <div className="booking-section-heading">
          <div>
            <p className="section-kicker">Hồ sơ đang xử lý</p>
            <h2 id="proposal-heading">Đề xuất &amp; vòng đời</h2>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
            <form
              className="booking-lookup"
              onSubmit={(event) => {
                event.preventDefault();
                void loadProposal(bookingId.trim());
              }}
            >
              <label>
                Mã booking
                <input
                  required
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value)}
                  placeholder="Mã hồ sơ đặt tiệc"
                />
              </label>
              <button disabled={pending !== null || bookingId.trim() === ''} type="submit">
                Tải hồ sơ
              </button>
            </form>
            {recentBookingIds.length > 0 ? (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <span style={{ color: '#64748b' }}>Tiệc của bạn:</span>
                <select
                  aria-label="Chọn nhanh mã tiệc gần đây"
                  value={recentBookingIds.includes(bookingId) ? bookingId : ''}
                  onChange={(event) => {
                    const selected = event.target.value;
                    if (selected) {
                      setBookingId(selected);
                      void loadProposal(selected);
                    }
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.78rem',
                    color: '#1e293b',
                    maxWidth: '280px',
                    fontFamily: 'monospace',
                  }}
                >
                  <option value="">-- Chọn nhanh mã tiệc ({recentBookingIds.length}) --</option>
                  {recentBookingIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>
        {proposal === null ? (
          <div className="booking-empty">
            <strong>Chưa chọn hồ sơ</strong>
            <p>Nhập mã booking hoặc tạo hồ sơ mới để xem đề xuất và thao tác hợp lệ.</p>
            {error && bookingId ? (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  textAlign: 'left',
                  maxWidth: '640px',
                  margin: '1.25rem auto 0',
                }}
              >
                <div
                  style={{
                    color: '#991b1b',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '4px',
                  }}
                >
                  💡 Gợi ý xử lý khi không có quyền xem hồ sơ đề xuất &amp; kịch bản:
                </div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: '0.82rem',
                    color: '#4b5563',
                    lineHeight: 1.5,
                  }}
                >
                  Tiệc cưới <code>{bookingId.slice(0, 8)}…</code> được tạo bởi Quản lý khác (hoặc là
                  dữ liệu mẫu nhà hàng). Theo quy định của hệ thống, chỉ Quản lý trực tiếp tạo hồ sơ
                  tư vấn ban đầu mới có quyền duyệt &amp; chỉnh sửa kịch bản tiệc này. Bạn vẫn có
                  thể thực hiện các thao tác vận hành khác:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    className="booking-secondary"
                    href={`/billing?bookingId=${bookingId}`}
                    style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
                  >
                    💳 Xem thanh toán &amp; Tiền cọc →
                  </Link>
                  <Link
                    className="booking-secondary"
                    href={`/staff?bookingId=${bookingId}`}
                    style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
                  >
                    👥 Phân công Staff tiệc này →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <ProposalPanel
            disabled={pending !== null}
            proposal={proposal}
            run={run}
            authorize={authorize}
            gateway={gateway}
            refresh={refresh}
          />
        )}
      </section>
    </main>
  );
}
