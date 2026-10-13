'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { minimumEventDate, useMinimumEventDate } from '../../lib/event-date';
import { TimelineEditor } from './timeline-editor';
import { ContractPanel } from './contract-panel';
import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  createManagementBookingGateway,
  type ManagementBookingGateway,
  type ProposalView,
  type BookingSelections,
} from './booking-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

const session = new ManagementIdentitySession(createIdentityApi());
const gateway = createManagementBookingGateway();
const catalogGateway = createVenueCatalogGateway();

export function ManagementBookingPage({
  autoLoadCatalog = false,
}: {
  autoLoadCatalog?: boolean;
} = {}) {
  const [access, setAccess] = useState<'loading' | 'anonymous' | 'denied' | 'manager'>('loading');
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then((snapshot) => {
      if (!active) return;
      setSnapshot(snapshot);
      setAccess(
        snapshot.status === 'anonymous'
          ? 'anonymous'
          : snapshot.presentation === 'manager'
            ? 'manager'
            : 'denied',
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void session
      .logout()
      .catch(() =>
        setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setAccess('anonymous');
        setLoggingOut(false);
      });
  };
  let content;
  if (access === 'loading') content = <PageState title="Đang xác minh quyền quản lý…" />;
  else if (access !== 'manager') {
    content = (
      <PageState title={access === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}>
        <p role="alert">
          {access === 'anonymous'
            ? 'Đăng nhập bằng tài khoản Quản lý để xử lý hồ sơ đặt tiệc.'
            : 'Tài khoản hiện tại không có quyền quản lý đặt tiệc.'}
        </p>
        {logoutError ? <p role="alert">{logoutError}</p> : null}
        <Link className="booking-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </PageState>
    );
  } else
    content = (
      <ManagementBookingWorkspace
        authorize={(operation) => session.authorize(operation)}
        gateway={gateway}
        autoLoadCatalog={autoLoadCatalog}
      />
    );
  return (
    <OperationsShell
      activePage="bookings"
      contentId="booking-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}

export function ManagementBookingWorkspace({
  authorize,
  gateway,
  autoLoadCatalog = false,
}: Readonly<{
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  autoLoadCatalog?: boolean;
}>) {
  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (result !== null) setProposal(result);
  };

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  const resetConsultation = () => {
    setConsultation(null);
    setMessage('Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".');
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
          onReset={resetConsultation}
          onCreate={async (input) => {
            const result = await run('consultation', () =>
              authorize((token) => gateway.createConsultation(token, input)),
            );
            if (result !== null) {
              setConsultation({ id: result.consultationId, revision: result.revision });
              setMessage('Đã tạo hồ sơ tư vấn.');
            }
          }}
          onInvite={async () => {
            if (consultation === null) return;
            const result = await run('invite', () =>
              authorize((token) =>
                gateway.invite(token, {
                  consultationId: consultation.id,
                  expectedRevision: consultation.revision,
                }),
              ),
            );
            if (result !== null) setMessage('Đã yêu cầu gửi lời mời không gian cộng tác.');
          }}
        />
        <BookingCreatePanel
          disabled={pending !== null}
          consultation={consultation}
          gateway={gateway}
          authorize={authorize}
          run={run}
          autoLoadCatalog={autoLoadCatalog}
          onCreated={(result, consultationId) => {
            setBookingId(result.bookingId);
            setConsultation({ id: consultationId, revision: result.consultationRevision });
            setMessage('Đã tạo hồ sơ đặt tiệc.');
            void loadProposal(result.bookingId);
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
        </div>
        {proposal === null ? (
          <div className="booking-empty">
            <strong>Chưa chọn hồ sơ</strong>
            <p>Nhập mã booking hoặc tạo hồ sơ mới để xem đề xuất và thao tác hợp lệ.</p>
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

function ConsultationPanel({
  consultation,
  disabled,
  onCreate,
  onInvite,
  onReset,
}: Readonly<{
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  onCreate: (input: { intendedEmail: string; displayName: string; note?: string }) => Promise<void>;
  onInvite: () => Promise<void>;
  onReset?: () => void;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note').trim();
    void onCreate({
      intendedEmail: field(data, 'email'),
      displayName: field(data, 'displayName'),
      ...(note === '' ? {} : { note }),
    });
  };
  return (
    <article className="booking-card">
      <span className="booking-step">01</span>
      <h2>Hồ sơ tư vấn</h2>
      <p style={{ color: '#5d665f', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
        Nhập thông tin cặp đôi và bấm <strong>&quot;Tạo hồ sơ tư vấn&quot;</strong> để cấp mã tự động sang Bước 02.
      </p>
      <form onSubmit={submit}>
        <label>
          Tên cặp đôi
          <input name="displayName" required minLength={1} maxLength={120} />
        </label>
        <label>
          Email liên hệ
          <input name="email" type="email" required />
        </label>
        <label>
          Ghi chú
          <textarea name="note" maxLength={2000} rows={3} />
        </label>
        <button disabled={disabled} type="submit">
          Tạo hồ sơ tư vấn
        </button>
      </form>
      {consultation === null ? null : (
        <div className="booking-result">
          <small>CONSULTATION · REV {consultation.revision}</small>
          <code>{consultation.id}</code>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button disabled={disabled} type="button" onClick={() => void onInvite()}>
              Gửi lời mời cộng tác
            </button>
            {onReset ? (
              <button disabled={disabled} type="button" className="booking-secondary" onClick={onReset}>
                + Đặt cho cặp đôi mới
              </button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

function BookingCreatePanel({
  authorize,
  consultation,
  disabled,
  gateway,
  onCreated,
  run,
  setMessage,
  onValidationError,
  autoLoadCatalog = false,
}: Readonly<{
  authorize: Authorize;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  onCreated: (
    result: {
      bookingId: string;
      revision: number;
      consultationRevision: number;
    },
    consultationId: string,
  ) => void;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  setMessage: (message: string) => void;
  onValidationError: (message: string) => void;
  autoLoadCatalog?: boolean;
}>) {
  const [selections, setSelections] = useState<BookingSelections | null>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const minimumDate = useMinimumEventDate();

  const loadCatalog = useCallback(() => {
    if (loadingSelections) return;
    setLoadingSelections(true);
    void run('catalog', () => authorize((token) => gateway.loadSelections(token)))
      .then((result) => {
        if (result !== null) setSelections(result);
      })
      .finally(() => {
        setLoadingSelections(false);
      });
  }, [authorize, gateway, loadingSelections, run]);

  useEffect(() => {
    if (autoLoadCatalog && selections === null && !loadingSelections) {
      loadCatalog();
    }
  }, [autoLoadCatalog, selections, loadingSelections, loadCatalog]);

  const validate = (form: HTMLFormElement, creating: boolean) => {
    if (disabled) return false;
    if (selections === null) {
      onValidationError(
        'Hãy tải danh mục đặt tiệc để chọn sảnh, ca và thực đơn trước khi tiếp tục.',
      );
      return false;
    }
    if (
      selections.halls.length === 0 ||
      selections.shifts.length === 0 ||
      (creating && selections.menus.length === 0)
    ) {
      onValidationError(
        'Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.',
      );
      return false;
    }
    const date = field(new FormData(form), 'eventDate');
    if (date !== '' && date < minimumEventDate()) {
      onValidationError(
        'Ngày tổ chức phải từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.',
      );
      return false;
    }
    if (creating) return form.reportValidity();
    return ['hallId', 'eventDate', 'shiftCode'].every((name) => {
      const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
      return control.reportValidity();
    });
  };
  const input = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      consultationId: field(data, 'consultationId'),
      hallId: field(data, 'hallId'),
      eventDate: field(data, 'eventDate'),
      shiftCode: field(data, 'shiftCode') as 'LUNCH' | 'DINNER',
      menuPackageVersionId: field(data, 'menuPackageVersionId'),
      tableCount: Number(data.get('tableCount')),
      planningHeadcount: Number(data.get('planningHeadcount')),
      expectedRevision: Number(data.get('expectedRevision')),
    };
  };
  return (
    <article className="booking-card">
      <span className="booking-step">02</span>
      <h2>Kiểm tra &amp; tạo booking</h2>
      <button
        className="booking-secondary"
        disabled={disabled || loadingSelections}
        type="button"
        onClick={loadCatalog}
      >
        {loadingSelections
          ? 'Đang tải danh mục…'
          : selections === null
            ? 'Tải danh mục đặt tiệc'
            : 'Tải lại danh mục đặt tiệc'}
      </button>
      {loadingSelections ? (
        <p role="status">Đang tải danh mục sảnh, khung giờ và thực đơn đang phục vụ…</p>
      ) : selections === null ? (
        <p>Tải danh mục để chọn sảnh, khung giờ và thực đơn đang phục vụ.</p>
      ) : selections.halls.length === 0 ||
        selections.menus.length === 0 ||
        selections.shifts.length === 0 ? (
        <p role="status">
          Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.
        </p>
      ) : (
        <p style={{ color: '#166534', fontSize: '0.875rem' }}>
          ✓ Đã tải {selections.halls.length} sảnh tiệc, {selections.menus.length} thực đơn đang phục vụ.
        </p>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate(event.currentTarget, true)) return;
          const value = input(event.currentTarget);
          void run('booking', () => authorize((token) => gateway.createBooking(token, value))).then(
            (result) => result && onCreated(result, value.consultationId),
          );
        }}
      >
        <label>
          Mã hồ sơ tư vấn
          <input
            key={consultation?.id ?? 'new'}
            name="consultationId"
            required
            defaultValue={consultation?.id ?? ''}
            placeholder="Tự động điền sau khi hoàn thành Bước 01"
          />
        </label>
        <small style={{ color: '#5d665f', fontSize: '0.75rem', marginTop: '-0.5rem', marginBottom: '0.75rem', display: 'block' }}>
          {consultation
            ? `✓ Đã kết nối hồ sơ tư vấn (Phiên bản ${consultation.revision})`
            : 'Mã này sẽ tự động điền khi bạn bấm "Tạo hồ sơ tư vấn" ở Bước 01'}
        </small>
        <label>
          Phiên bản hồ sơ tư vấn
          <input
            key={`${consultation?.id}:${consultation?.revision}`}
            name="expectedRevision"
            type="number"
            min={1}
            required
            defaultValue={consultation?.revision ?? 1}
          />
        </label>
        <label>
          Sảnh tiệc
          <select
            name="hallId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải sảnh…' : 'Chọn sảnh'}
            </option>
            {selections?.halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name} · tối đa {hall.maxGuests} khách
              </option>
            ))}
          </select>
        </label>
        <div className="booking-fields-inline">
          <label>
            <span id="booking-date-label">Ngày tổ chức</span>
            <input
              name="eventDate"
              type="date"
              min={minimumDate}
              aria-labelledby="booking-date-label"
              aria-describedby="booking-date-help"
              required
            />
            <small id="booking-date-help">Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).</small>
          </label>
          <label>
            Ca
            <select name="shiftCode" defaultValue="DINNER" required>
              <option value="" disabled>
                Chọn ca
              </option>
              {selections === null ? (
                <>
                  <option value="LUNCH">Trưa</option>
                  <option value="DINNER">Tối</option>
                </>
              ) : null}
              {selections?.shifts.map((shift) => (
                <option key={shift.code} value={shift.code}>
                  {shift.code === 'LUNCH' ? 'Trưa' : 'Tối'} · {shift.startTime}–{shift.endTime}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Thực đơn đặt tiệc
          <select
            name="menuPackageVersionId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải thực đơn…' : 'Chọn thực đơn'}
            </option>
            {selections?.menus.map((menu) => (
              <option key={menu.versionId} value={menu.versionId}>
                {menu.name} · bản {menu.versionNumber} · {money(menu.priceVndPerTable)}/bàn
              </option>
            ))}
          </select>
        </label>
        <div className="booking-fields-inline">
          <label>
            Số bàn
            <input name="tableCount" type="number" min={1} max={500} defaultValue={20} required />
          </label>
          <label>
            Số khách dự kiến
            <input
              name="planningHeadcount"
              type="number"
              min={0}
              max={10000}
              defaultValue={200}
              required
            />
          </label>
        </div>
        <div className="booking-actions">
          <button
            className="booking-secondary"
            disabled={disabled}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form === null || !validate(form, false)) return;
              const value = input(form);
              void run('availability', () =>
                authorize((token) => gateway.checkAvailability(token, value)),
              ).then((result) => {
                if (result !== null)
                  setMessage(
                    result.available
                      ? 'Khung giờ đang trống.'
                      : `Khung giờ đang được giữ${result.expiresAt === null ? '.' : ` đến ${formatDateTime(result.expiresAt)}.`}`,
                  );
              });
            }}
          >
            Kiểm tra lịch
          </button>
          <button disabled={disabled} type="submit">
            Tạo booking
          </button>
        </div>
      </form>
    </article>
  );
}

function ProposalPanel({
  authorize,
  disabled,
  gateway,
  proposal,
  refresh,
  run,
}: Readonly<{
  authorize: Authorize;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  proposal: ProposalView;
  refresh: (message: string) => Promise<void>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}>) {
  const command = async (
    label: string,
    success: string,
    operation: (token: string) => Promise<void>,
  ) => {
    if ((await run(label, () => authorize(operation))) !== null) await refresh(success);
  };
  return (
    <div className="proposal-layout">
      <article className="proposal-summary">
        <div className="proposal-status">
          <span>{proposal.phase.replaceAll('_', ' ')}</span>
          <small>REV {proposal.revision}</small>
        </div>
        <h3>{proposal.proposal.hall.name}</h3>
        <p>
          {proposal.eventDate} · {proposal.proposal.shift.startTime}–
          {proposal.proposal.shift.endTime}
        </p>
        <dl>
          <div>
            <dt>Thực đơn</dt>
            <dd>{proposal.proposal.menu.name}</dd>
          </div>
          <div>
            <dt>Số bàn</dt>
            <dd>{proposal.proposal.tableCount}</dd>
          </div>
          <div>
            <dt>Tạm tính</dt>
            <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
          </div>
          <div>
            <dt>Tiền cọc</dt>
            <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
          </div>
        </dl>
        <button
          disabled={disabled || ['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(proposal.phase)}
          type="button"
          onClick={() =>
            void command('hold', 'Đã giữ khung giờ trong 15 phút.', (token) =>
              gateway.acquireHold(token, proposal.bookingId, proposal.revision),
            )
          }
        >
          Giữ lịch 15 phút
        </button>
      </article>
      <article className="proposal-timeline">
        <h3>Kịch bản tiệc</h3>
        {proposal.timeline === null ? (
          <p>Chưa có mốc chương trình.</p>
        ) : (
          <ol>
            {proposal.timeline.items.map((item) => (
              <li key={item.itemId}>
                <time>{item.startTime}</time>
                <span>
                  <strong>{item.title}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p>
          Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
          {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
        </p>
        <TimelineEditor
          key={proposal.bookingId + ':' + (proposal.timeline?.revisionId ?? 'empty')}
          disabled={disabled || !proposal.capabilities.canEditTimeline}
          initialItems={proposal.timeline?.items ?? []}
          templateSource={{
            load: async () => {
              const result = await run('templates', () =>
                authorize((token) => catalogGateway.loadTimelines(token)),
              );
              if (result === null) throw new Error('Timeline template loading failed.');
              return result;
            },
            shift: proposal.proposal.shift,
          }}
          needsReason={proposal.phase === 'CONFIRMED'}
          onSave={(items, reason) =>
            command('timeline', 'Đã lưu revision kịch bản mới.', (token) =>
              proposal.phase === 'CONFIRMED'
                ? gateway.requestChange(token, {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                    items,
                    reason,
                  })
                : gateway.saveTimeline(token, {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                    predecessorRevisionId: proposal.timeline?.revisionId ?? null,
                    items,
                  }),
            )
          }
        />
        {proposal.timeline === null ? null : (
          <button
            className="booking-secondary"
            disabled={disabled || !proposal.capabilities.canApproveTimeline}
            type="button"
            onClick={() =>
              void command('approval', 'Đã ghi nhận phê duyệt của Quản lý.', (token) =>
                gateway.approveTimeline(token, {
                  bookingId: proposal.bookingId,
                  revisionId: proposal.timeline!.revisionId,
                  expectedRevision: proposal.revision,
                }),
              )
            }
          >
            Phê duyệt revision hiện tại
          </button>
        )}
      </article>
      <ContractPanel
        bookingId={proposal.bookingId}
        bookingRevision={proposal.revision}
        disabled={disabled}
        onRefresh={() => void refresh('Đã làm mới dữ liệu hợp đồng.')}
      />
      <article className="proposal-danger">
        <h3>Kết thúc vòng đời</h3>
        {(proposal.cancellationRequests ?? []).map((request) => (
          <form
            key={request.requestId}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const submitter = event.nativeEvent.submitter;
              const decision =
                submitter instanceof HTMLButtonElement && submitter.value === 'APPROVE'
                  ? 'APPROVE'
                  : 'REJECT';
              const reason = field(new FormData(form), 'decisionReason');
              void command(
                'cancellation-decision',
                decision === 'APPROVE' ? 'Đã chấp nhận yêu cầu hủy.' : 'Đã từ chối yêu cầu hủy.',
                (token) =>
                  gateway.decideCancellation(token, {
                    bookingId: proposal.bookingId,
                    requestId: request.requestId,
                    expectedRevision: proposal.revision,
                    decision,
                    reason,
                  }),
              );
            }}
          >
            <h4>Yêu cầu hủy từ cặp đôi</h4>
            <p>{request.reason}</p>
            <label>
              Lý do quyết định
              <textarea name="decisionReason" required minLength={1} maxLength={500} rows={2} />
            </label>
            <div className="booking-actions">
              <button type="submit" value="APPROVE" disabled={disabled}>
                Chấp nhận yêu cầu hủy
              </button>
              <button type="submit" value="REJECT" disabled={disabled}>
                Từ chối yêu cầu hủy
              </button>
            </div>
          </form>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reason = field(new FormData(event.currentTarget), 'reason');
            void command('cancel', 'Booking đã được hủy.', (token) =>
              gateway.cancel(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                reason,
              }),
            );
          }}
        >
          <label>
            Lý do hủy
            <textarea name="reason" required minLength={1} maxLength={500} rows={3} />
          </label>
          <button
            disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)}
            type="submit"
          >
            Hủy booking
          </button>
        </form>
        <button
          className="booking-secondary"
          disabled={disabled || proposal.phase !== 'CONFIRMED'}
          type="button"
          onClick={() =>
            void command('complete', 'Booking đã hoàn thành.', (token) =>
              gateway.complete(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
              }),
            )
          }
        >
          Đánh dấu hoàn thành
        </button>
      </article>
    </div>
  );
}

function PageState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return (
    <main className="booking-state" id="booking-main">
      <p className="section-kicker">Wedding Estate</p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function errorMessage(error: unknown, shift?: ProposalView['proposal']['shift']): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể hoàn tất yêu cầu. Dữ liệu đang nhập vẫn được giữ lại.';
  if (
    error.code === 'VALIDATION_ERROR' &&
    error.details?.some((detail) => detail.path === 'eventDate')
  )
    return 'Ngày tổ chức phải là ngày hợp lệ, từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.';
  if (error.code === 'TIMELINE_ITEM_TIME_INVALID')
    return shift
      ? `Giờ bắt đầu mốc chương trình phải từ ${shift.startTime} đến trước ${shift.endTime}. Hãy sửa giờ rồi lưu lại. Nội dung đã nhập vẫn được giữ lại.`
      : 'Giờ bắt đầu mốc chương trình phải nằm trong ca tiệc đã chọn. Hãy sửa giờ rồi lưu lại.';
  const messages: Record<string, string> = {
    STALE_BOOKING_REVISION:
      'Hồ sơ đã thay đổi ở nơi khác hoặc mã hồ sơ tư vấn này đã được dùng để tạo tiệc rồi. Hãy bấm "Tạo hồ sơ tư vấn" ở Bước 01 để tạo mã mới cho cặp đôi.',
    SLOT_NOT_AVAILABLE: 'Khung giờ vừa được giữ bởi hồ sơ khác. Hãy chọn lịch khác.',
    DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi hồ sơ.',
    BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
    TIMELINE_APPROVAL_REQUIRES_ITEM:
      'Hãy thêm và lưu ít nhất một mốc chương trình trước khi phê duyệt.',
    TIMELINE_ITEM_COUNT_INVALID:
      'Kịch bản chỉ được có tối đa 100 mốc. Hãy xóa bớt mốc rồi lưu lại.',
    TIMELINE_ITEM_TEXT_INVALID:
      'Nội dung mỗi mốc cần từ 1–120 ký tự; ghi chú tối đa 2.000 ký tự. Hãy sửa nội dung rồi lưu lại.',
    TIMELINE_REVISION_SUPERSEDED:
      'Kịch bản đã có phiên bản mới. Hãy tải lại hồ sơ trước khi tiếp tục.',
  };
  return messages[error.code] ?? 'Yêu cầu chưa hoàn tất. Hãy kiểm tra dữ liệu và thử lại.';
}
