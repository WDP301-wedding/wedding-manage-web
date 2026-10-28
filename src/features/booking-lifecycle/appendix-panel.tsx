'use client';

import { contractStyles } from './contract.styles';
import { useAppendixPanel, type AppendixPanelState } from './use-appendix-panel';
import { AppendixDetailView } from './appendix-detail-view';

export interface AppendixPanelProps {
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
  panelState?: AppendixPanelState;
}

export const appendixStateLabels: Record<string, string> = {
  DRAFT: 'Bản nháp (Draft)',
  AWAITING_APPROVAL: 'Đang chờ hai bên duyệt',
  APPROVED: 'Đã duyệt (Có hiệu lực)',
  SUPERSEDED: 'Đã thay thế',
};

export function AppendixPanel(props: Readonly<AppendixPanelProps>) {
  return props.panelState ? (
    <AppendixPanelView disabled={props.disabled} panelState={props.panelState} />
  ) : (
    <ConnectedAppendixPanel {...props} />
  );
}

function ConnectedAppendixPanel(props: Readonly<AppendixPanelProps>) {
  const panelState = useAppendixPanel(props);
  return <AppendixPanelView disabled={props.disabled} panelState={panelState} />;
}

function AppendixPanelView({
  disabled,
  panelState,
}: Readonly<{
  disabled: boolean;
  panelState: AppendixPanelState;
}>) {
  const {
    loading,
    data,
    activeAppendix,
    setSelectedRevisionId,
    managerApproved,
    coupleApproved,
    handleApproveAppendix,
    handleSubmitAppendix,
    refreshAppendices,
  } = panelState;

  const revisions = data?.revisions ?? [];

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={contractStyles.header}>
        <div>
          <span className="section-kicker">Phụ lục điều chỉnh</span>
          <h4
            style={{
              margin: '0.25rem 0',
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--hy-wine, #7a1f3d)',
              lineHeight: 1.3,
            }}
          >
            Phụ lục hợp đồng tiệc cưới
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            disabled={disabled || loading}
            onClick={refreshAppendices}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              borderRadius: 6,
              border: '1px solid var(--hy-outline, #eadfd6)',
              background: '#ffffff',
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              color: 'var(--hy-text, #2b1d22)',
            }}
          >
            {loading ? 'Đang tải…' : 'Làm mới phụ lục'}
          </button>
        </div>
      </div>

      {loading && revisions.length === 0 ? (
        <p style={{ color: 'var(--hy-text-muted, #6e5d63)', fontSize: '0.875rem' }}>
          Đang tải danh sách phụ lục…
        </p>
      ) : revisions.length === 0 ? (
        <div style={contractStyles.emptyBox}>
          <p style={{ color: 'var(--hy-text-muted, #6e5d63)', margin: 0, fontSize: '0.875rem' }}>
            Chưa có phụ lục hợp đồng nào được tạo cho tiệc này. Phụ lục được lập khi cần điều chỉnh
            thực đơn, số bàn, dịch vụ hoặc số lượng thiệp in sau khi hợp đồng chính đã ký và đặt
            cọc.
          </p>
        </div>
      ) : (
        <div>
          {/* Danh sách các phiên bản phụ lục nếu có nhiều hơn 1 */}
          {revisions.length > 1 ? (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
                borderBottom: '1px dashed var(--hy-outline, #eadfd6)',
                paddingBottom: '0.75rem',
              }}
            >
              {revisions.map((rev) => {
                const isSelected = rev.revisionId === activeAppendix?.revisionId;
                const isPendingManager =
                  rev.state === 'AWAITING_APPROVAL' &&
                  !rev.approvals.some((a) => a.party === 'MANAGER');
                return (
                  <button
                    key={rev.revisionId}
                    type="button"
                    onClick={() => setSelectedRevisionId(rev.revisionId)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 6,
                      fontSize: '0.825rem',
                      fontWeight: isSelected ? 600 : 500,
                      border: isSelected
                        ? '1px solid var(--hy-wine, #7a1f3d)'
                        : '1px solid var(--hy-outline, #eadfd6)',
                      background: isSelected ? 'var(--hy-surface-container, #fdf6ee)' : '#ffffff',
                      color: isSelected ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-text, #2b1d22)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>Phụ lục số {rev.revisionNumber}</span>
                    {isPendingManager ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--hy-wine, #7a1f3d)',
                        }}
                        title="Chờ Quản lý duyệt"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {activeAppendix ? (
            <AppendixDetailView
              activeAppendix={activeAppendix}
              disabled={disabled}
              loading={loading}
              managerApproved={Boolean(managerApproved)}
              coupleApproved={Boolean(coupleApproved)}
              appendixStateLabels={appendixStateLabels}
              handleApproveAppendix={handleApproveAppendix}
              handleSubmitAppendix={handleSubmitAppendix}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
