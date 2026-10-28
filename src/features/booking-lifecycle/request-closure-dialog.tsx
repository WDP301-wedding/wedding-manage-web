'use client';
import { useEffect, useRef } from 'react';
export function RequestClosureDialog({
  name,
  onCancel,
  onConfirm,
}: Readonly<{ name: string; onCancel: () => void; onConfirm: () => void }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (typeof element?.showModal === 'function') {
      element.showModal();
    }
    return () => {
      if (typeof element?.close === 'function') {
        element.close();
      }
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="hy-modal-dialog"
      aria-labelledby="close-request-title"
      aria-describedby="close-request-description"
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === dialog.current) onCancel();
      }}
    >
      <div className="hy-modal-content">
        <div className="hy-modal-header">
          <div className="hy-modal-header-left">
            <div>
              <h2 id="close-request-title" className="hy-modal-title">
                Đóng yêu cầu của {name}?
              </h2>
              <span className="hy-modal-subtitle">Xác nhận đóng hồ sơ tư vấn</span>
            </div>
          </div>
          <button
            type="button"
            className="hy-modal-close-btn"
            aria-label="Đóng"
            onClick={onCancel}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="hy-modal-body">
          <p
            id="close-request-description"
            className="hy-modal-note"
            style={{ fontSize: '0.86rem', color: 'var(--hy-ink, #2b1d22)' }}
          >
            Yêu cầu được chuyển sang mục Đã đóng. Không xóa tài khoản, hợp đồng hoặc lịch sử thanh
            toán. Bạn sẽ không thể mở hồ sơ mới từ yêu cầu đã đóng.
          </p>
        </div>

        <div className="hy-modal-footer intake-actions">
          <button type="button" className="hy-action-btn-secondary" onClick={onCancel}>
            Giữ yêu cầu
          </button>
          <button
            type="button"
            className="hy-action-btn-primary"
            style={{ background: '#b91c1c', borderColor: '#b91c1c' }}
            onClick={onConfirm}
          >
            Xác nhận đóng yêu cầu
          </button>
        </div>
      </div>
    </dialog>
  );
}
