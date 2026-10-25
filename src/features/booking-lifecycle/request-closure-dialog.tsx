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
      aria-labelledby="close-request-title"
      aria-describedby="close-request-description"
      onCancel={onCancel}
    >
      <h2 id="close-request-title">Đóng yêu cầu của {name}?</h2>
      <p id="close-request-description">
        Yêu cầu được chuyển sang mục Đã đóng. Không xóa tài khoản, hợp đồng hoặc lịch sử thanh toán.
        Bạn sẽ không thể mở hồ sơ mới từ yêu cầu đã đóng.
      </p>
      <div className="intake-actions">
        <button type="button" onClick={onCancel}>
          Giữ yêu cầu
        </button>
        <button type="button" onClick={onConfirm}>
          Xác nhận đóng yêu cầu
        </button>
      </div>
    </dialog>
  );
}
