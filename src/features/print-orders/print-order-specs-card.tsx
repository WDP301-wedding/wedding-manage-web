import type React from 'react';
import { FileTextIcon } from './icons';
import { formatVnd, type PrintOrderView } from './print-orders-types';

export interface PrintOrderSpecsCardProps {
  selectedOrder: PrintOrderView;
}

export function PrintOrderSpecsCard({ selectedOrder }: Readonly<PrintOrderSpecsCardProps>) {
  return (
    <div className="v0-detail-card">
      <div className="v0-card-head">
        <FileTextIcon width={18} height={18} />
        <h3>Dòng thiết kế đã chốt</h3>
        <span className="v0-badge">{selectedOrder.lines.length} dòng</span>
      </div>

      {/* Render All Lines */}
      <div className="v0-lines-list">
        {selectedOrder.lines.map((line, idx) => {
          const quotedLine = selectedOrder.currentCommercialRevision?.lines.find(
            (ql) => ql.lineId === line.lineId,
          );
          return (
            <div key={line.lineId} className="v0-line-item-box">
              <div className="v0-line-item-header">
                <strong>
                  #{idx + 1}: {line.displayVariant ?? `Bản in ${line.designId}`}
                </strong>
                <span className="v0-line-qty-badge">{line.quantity} bản in</span>
              </div>
              <div className="v0-line-item-meta">
                <span>
                  Mã thiết kế: <code>{line.designId}</code>
                </span>
                <span>
                  Bản in (Rev):{' '}
                  <code>{line.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}</code>
                </span>
                {quotedLine ? (
                  <span>
                    Đơn giá: {formatVnd(quotedLine.unitPriceVnd)}/bản (
                    {formatVnd(quotedLine.lineTotalVnd)})
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Neutral Digital Preview Placeholder */}
      <div className="v0-design-preview-container">
        <div className="v0-design-preview-frame">
          <div className="v0-design-preview-icon" aria-hidden="true">
            <FileTextIcon width={24} height={24} />
          </div>
          <div className="v0-design-preview-title">Chưa có bản xem trước kỹ thuật số</div>
          <div className="v0-design-preview-caption">
            Mã thiết kế: {selectedOrder.lines[0]?.designId ?? 'Chưa xác định'} · Phiên bản in:{' '}
            {selectedOrder.lines[0]?.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}
          </div>
          <small className="v0-design-preview-note">
            Bản vẽ in ấn số hóa sẽ được đồng bộ khi studio thiệp cưới xuất bản bản in chính thức.
          </small>
        </div>
      </div>
    </div>
  );
}
