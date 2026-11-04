'use client';
import { useRef, useState, type FormEvent } from 'react';
import { billingService, type FinalInvoicesResponse } from '../../services/billing.service';
import { notify } from '../../design-system/notifications';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { HySelect } from '../../components/ui/select-field';
import { formatVnd } from '../../lib/formatters';

type Line = {
  kind: 'DEBIT' | 'CREDIT';
  name: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
};
const emptyLine = (): Line => ({ kind: 'DEBIT', name: '', quantity: 1, unit: '', unitPriceVnd: 0 });
export function InvoiceAdjustmentForm({
  bookingId,
  current,
  billingRevision,
  disabled,
  onCancel,
  onSaved,
}: Readonly<{
  bookingId: string;
  current: FinalInvoicesResponse['revisions'][number];
  billingRevision: number;
  disabled: boolean;
  onCancel: () => void;
  onSaved: () => void;
}>) {
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [review, setReview] = useState(false),
    [pending, setPending] = useState(false);
  const lock = useRef(false),
    intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const update = (index: number, patch: Partial<Line>) =>
    setLines((previous) => previous.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const valid =
    reason.trim().length > 0 &&
    reason.trim().length <= 500 &&
    lines.length > 0 &&
    lines.length <= 50 &&
    lines.every(
      (line) =>
        line.name.trim().length > 0 &&
        line.name.trim().length <= 120 &&
        line.unit.trim().length > 0 &&
        line.unit.trim().length <= 80 &&
        Number.isSafeInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 2147483647 &&
        Number.isSafeInteger(line.unitPriceVnd) &&
        line.unitPriceVnd >= 0 &&
        Number.isSafeInteger(line.quantity * line.unitPriceVnd),
    );
  const delta = valid
    ? lines.reduce(
        (sum, line) =>
          sum +
          BigInt(line.quantity) * BigInt(line.unitPriceVnd) * (line.kind === 'DEBIT' ? 1n : -1n),
        0n,
      )
    : null;
  const nextTotal = delta === null ? null : BigInt(current.document.totalVnd) + delta;
  const withinLimit =
    nextTotal !== null &&
    nextTotal >= 0n &&
    nextTotal <= BigInt(Number.MAX_SAFE_INTEGER) &&
    delta !== null &&
    delta <= BigInt(Number.MAX_SAFE_INTEGER) &&
    delta >= -BigInt(Number.MAX_SAFE_INTEGER);
  const save = async () => {
    if (lock.current || !valid || !withinLimit || disabled) return;
    const body = {
      expectedBillingRevision: billingRevision,
      expectedInvoiceRevisionId: current.invoiceRevisionId,
      reason: reason.trim(),
      lines: lines.map((line) => ({ ...line, name: line.name.trim(), unit: line.unit.trim() })),
    };
    const fingerprint = JSON.stringify([bookingId, body]);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setPending(true);
    try {
      await billingService.adjustInvoice(bookingId, body, intent.current.key);
      notify.success('Đã tạo phiên bản điều chỉnh hóa đơn. Bản cũ được giữ nguyên.');
      onSaved();
    } catch (cause) {
      notify.error(cause);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid && withinLimit) setReview(true);
  };
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-primary bg-card p-4"
      aria-label="Điều chỉnh hóa đơn"
    >
      <h3 className="font-semibold">Điều chỉnh từ hóa đơn bản {current.revisionNumber}</h3>
      <p className="text-xs text-muted-foreground">
        Tạo phiên bản mới có lý do và các khoản tăng/giảm. Không sửa hoặc xóa chứng từ đã chốt. Tổng
        chính thức do máy chủ kiểm tra lại.
      </p>
      {!review ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold">
            Lý do điều chỉnh
            <Input
              value={reason}
              maxLength={500}
              required
              disabled={pending || disabled}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {lines.map((line, index) => (
            <fieldset
              key={index}
              disabled={pending || disabled}
              className="grid gap-2 rounded-lg bg-muted p-3 sm:grid-cols-2"
            >
              <legend className="text-xs">Khoản {index + 1}</legend>
              <label className="text-xs">
                Loại
                <HySelect
                  value={line.kind}
                  onChange={(event) =>
                    update(index, { kind: event.target.value === 'CREDIT' ? 'CREDIT' : 'DEBIT' })
                  }
                >
                  <option value="DEBIT">Tăng nghĩa vụ thanh toán</option>
                  <option value="CREDIT">Giảm nghĩa vụ thanh toán</option>
                </HySelect>
              </label>
              <label className="text-xs">
                Hạng mục
                <Input
                  value={line.name}
                  maxLength={120}
                  required
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </label>
              <label className="text-xs">
                Số lượng
                <Input
                  type="number"
                  value={line.quantity}
                  min={1}
                  max={2147483647}
                  step={1}
                  required
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => update(index, { quantity: Number(event.target.value) })}
                />
              </label>
              <label className="text-xs">
                Đơn vị
                <Input
                  value={line.unit}
                  maxLength={80}
                  required
                  onChange={(event) => update(index, { unit: event.target.value })}
                />
              </label>
              <label className="text-xs">
                Đơn giá (VND)
                <Input
                  type="number"
                  value={line.unitPriceVnd}
                  min={0}
                  step={1}
                  required
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => update(index, { unitPriceVnd: Number(event.target.value) })}
                />
              </label>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLines((previous) => previous.filter((_, i) => i !== index))}
                >
                  Bỏ khoản này
                </Button>
              ) : null}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={lines.length >= 50 || pending || disabled}
            onClick={() => setLines((previous) => [...previous, emptyLine()])}
          >
            Thêm khoản điều chỉnh
          </Button>
          <Button type="submit" disabled={!valid || !withinLimit || pending || disabled}>
            Kiểm tra điều chỉnh
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <p>
            <strong>Lý do:</strong> {reason}
          </p>
          {lines.map((line, index) => (
            <p key={index} className="text-sm">
              {line.kind === 'DEBIT' ? '+' : '−'} {line.name} · {line.quantity} {line.unit} ×{' '}
              {formatVnd(line.unitPriceVnd)}
            </p>
          ))}
          <p>
            Tổng dự kiến sau điều chỉnh:{' '}
            <strong>{withinLimit ? formatVnd(Number(nextTotal)) : 'Không hợp lệ'}</strong>
          </p>
          <p className="text-xs">Điều chỉnh nghĩa vụ không tự chuyển tiền hay hoàn tiền.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || disabled || !valid || !withinLimit}
              onClick={() => void save()}
            >
              {pending ? 'Đang ghi nhận…' : 'Xác nhận tạo bản điều chỉnh'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setReview(false)}
            >
              Quay lại chỉnh sửa
            </Button>
          </div>
        </div>
      )}
      <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
        Bỏ bản điều chỉnh
      </Button>
    </section>
  );
}
