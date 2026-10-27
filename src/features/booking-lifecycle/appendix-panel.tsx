'use client';

import { useState } from 'react';
import { formatVnd } from '../../lib/formatters';
import { ContractLinesTable } from './contract-lines-table';
import { contractStyles } from './contract.styles';
import { useAppendixPanel, type AppendixPanelState } from './use-appendix-panel';

export interface AppendixPanelProps {
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
  panelState?: AppendixPanelState;
}

const appendixStateLabels: Record<string, string> = {
  DRAFT: 'Bản nháp (Draft)',
  AWAITING_APPROVAL: 'Đang chờ hai bên duyệt',
  APPROVED: 'Đã duyệt (Có hiệu lực)',
  SUPERSEDED: 'Đã thay thế',
};

export function AppendixPanel({
  bookingId,
  bookingRevision,
  disabled,
  onRefresh,
  panelState,
}: Readonly<AppendixPanelProps>) {
  const fallbackState = useAppendixPanel({ bookingId, bookingRevision, onRefresh });
  const {
    loading,
    data,
    error,
    actionMessage,
    activeAppendix,
    selectedRevisionId,
    setSelectedRevisionId,
    managerApproved,
    coupleApproved,
    handleApproveAppendix,
    handleSubmitAppendix,
    refreshAppendices,
  } = panelState ?? fallbackState;

  const [confirmingApproval, setConfirmingApproval] = useState(false);

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
            <div
              style={{
                background: 'var(--hy-surface-container, #fdf6ee)',
                border: '1px solid var(--hy-outline, #eadfd6)',
                borderRadius: 8,
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <h5
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--hy-ink, #2b1d22)',
                        lineHeight: 1.3,
                      }}
                    >
                      Phụ lục số {activeAppendix.revisionNumber}
                    </h5>
                    <span style={contractStyles.statusBadge(activeAppendix.state)}>
                      {appendixStateLabels[activeAppendix.state] ?? activeAppendix.state}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.85rem',
                      color: 'var(--hy-text-muted, #6e5d63)',
                    }}
                  >
                    Lý do điều chỉnh: <strong>{activeAppendix.document.reason}</strong>
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <small
                    style={{
                      color: 'var(--hy-text-muted, #6e5d63)',
                      display: 'block',
                      fontSize: '0.75rem',
                    }}
                  >
                    Chênh lệch thoả thuận
                  </small>
                  <strong
                    style={{
                      fontSize: '1.15rem',
                      color:
                        activeAppendix.document.deltaVnd > 0
                          ? 'var(--hy-wine, #7a1f3d)'
                          : activeAppendix.document.deltaVnd < 0
                            ? 'var(--hy-status-success, #2f6b4f)'
                            : 'var(--hy-text, #2b1d22)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {activeAppendix.document.deltaVnd > 0 ? '+' : ''}
                    {formatVnd(activeAppendix.document.deltaVnd)}
                  </strong>
                </div>
              </div>

              {/* Thông số tài chính phụ lục */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  background: '#ffffff',
                  border: '1px solid var(--hy-outline, #eadfd6)',
                  borderRadius: 6,
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Tổng trước điều chỉnh:
                  </span>
                  <strong>{formatVnd(activeAppendix.document.beforeTotalVnd)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Tổng sau điều chỉnh:
                  </span>
                  <strong style={{ color: 'var(--hy-wine, #7a1f3d)' }}>
                    {formatVnd(activeAppendix.document.afterTotalVnd)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                    Ngày lập phụ lục:
                  </span>
                  <span>{new Date(activeAppendix.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Chi tiết bảng dịch vụ sau điều chỉnh */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: 6,
                  marginBottom: '1rem',
                }}
              >
                <ContractLinesTable
                  lines={activeAppendix.document.afterLines}
                  title={`Chi tiết các hạng mục sau điều chỉnh (${activeAppendix.document.afterLines.length})`}
                />
              </div>

              {/* Trạng thái phê duyệt 2 bên */}
              <div style={contractStyles.approvalStatusBox}>
                <div>
                  <span>Quản lý (Manager): </span>
                  <strong style={contractStyles.approvalStatusText(Boolean(managerApproved))}>
                    {managerApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
                  </strong>
                </div>
                <div>
                  <span>Cặp đôi (Couple): </span>
                  <strong style={contractStyles.approvalStatusText(Boolean(coupleApproved))}>
                    {coupleApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
                  </strong>
                </div>
              </div>

              {/* Hộp xác nhận phê duyệt nếu đang bấm nút */}
              {confirmingApproval ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid var(--hy-wine, #7a1f3d)',
                    borderRadius: 8,
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <h6
                    style={{
                      margin: '0 0 0.5rem',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.95rem',
                      color: 'var(--hy-wine, #7a1f3d)',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    Xác nhận phê duyệt phụ lục số {activeAppendix.revisionNumber}
                  </h6>
                  <p
                    style={{
                      margin: '0 0 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--hy-ink, #2b1d22)',
                    }}
                  >
                    Bạn đang đồng ý thay đổi tổng thoả thuận tiệc từ{' '}
                    <strong>{formatVnd(activeAppendix.document.beforeTotalVnd)}</strong> thành{' '}
                    <strong>{formatVnd(activeAppendix.document.afterTotalVnd)}</strong> (chênh lệch:{' '}
                    <strong>
                      {activeAppendix.document.deltaVnd > 0 ? '+' : ''}
                      {formatVnd(activeAppendix.document.deltaVnd)}
                    </strong>
                    ). Thao tác phê duyệt mang tính pháp lý và không thể thu hồi.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={disabled || loading}
                      onClick={() => setConfirmingApproval(false)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: 6,
                        border: '1px solid var(--hy-outline, #eadfd6)',
                        background: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Huỷ bỏ
                    </button>
                    <button
                      type="button"
                      disabled={disabled || loading}
                      onClick={async () => {
                        await handleApproveAppendix(activeAppendix.revisionId);
                        setConfirmingApproval(false);
                      }}
                      style={{
                        padding: '0.45rem 1.25rem',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--hy-status-success, #2f6b4f)',
                        color: '#ffffff',
                        cursor: disabled || loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {loading ? 'Đang duyệt…' : 'Xác nhận duyệt phụ lục'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Các nút hành động cho phụ lục */}
              <div style={contractStyles.actionsRow}>
                {activeAppendix.state === 'DRAFT' ? (
                  <button
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => void handleSubmitAppendix(activeAppendix.revisionId)}
                    style={contractStyles.submitDraftButton(disabled || loading)}
                  >
                    {loading ? 'Đang gửi…' : 'Gửi duyệt phụ lục'}
                  </button>
                ) : null}

                {activeAppendix.state === 'AWAITING_APPROVAL' &&
                !managerApproved &&
                !confirmingApproval ? (
                  <button
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => setConfirmingApproval(true)}
                    style={contractStyles.approveButton(disabled || loading)}
                  >
                    Phê duyệt phụ lục (Quản lý)
                  </button>
                ) : null}

                {activeAppendix.state === 'APPROVED' ? (
                  <span
                    style={{
                      color: 'var(--hy-status-success, #2f6b4f)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    ✓ Phụ lục đã có hiệu lực thi hành đầy đủ giữa hai bên.
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
