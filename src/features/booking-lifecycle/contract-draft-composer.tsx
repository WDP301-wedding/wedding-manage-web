'use client';
import { useEffect, useRef, useState } from 'react';
import { describeApiError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/notifications';
import { formatVnd } from '../../lib/formatters';
import {
  contractService,
  type ContractPreview,
  type ContractRevisionItem,
  type ContractDraftBody,
} from '../../services/contract.service';
import type { ProposalView } from './booking-api';
import { loadContractChoices, type CatalogChoice, type DraftLine } from './contract-draft-catalog';
import { categoryLabels, ContractLinesTable } from './contract-lines-table';
import { cn } from 'cn';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const keyOf = (line: Pick<DraftLine, 'category' | 'sourceId'>) =>
  line.category + ':' + line.sourceId.toLowerCase();
export function ContractDraftComposer({
  proposal,
  current,
  seed,
  seedTotalVnd,
  bookingRevision,
  onCancel,
  onSaved,
}: Readonly<{
  proposal: ProposalView;
  current: ContractRevisionItem | null;
  seed: readonly ContractRevisionItem['document']['lines'][number][];
  seedTotalVnd: number;
  bookingRevision: number;
  onCancel: () => void;
  onSaved: () => void;
}>) {
  const [lines, setLines] = useState<readonly DraftLine[]>(() =>
    seed.map(({ category, sourceId, sourceRevisionId, quantity }) => ({
      category,
      sourceId,
      sourceRevisionId,
      quantity,
    })),
  );
  const [choices, setChoices] = useState<readonly CatalogChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<{ fingerprint: string; data: ContractPreview } | null>(
    null,
  );
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const lock = useRef(false);
  const epoch = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setChoices(null);
    void loadContractChoices(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setChoices(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(describeApiError(err).message);
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    epoch.current++;
    return () => {
      epoch.current++;
    };
  }, [bookingRevision, proposal.timeline?.revisionId]);
  const timelineId = proposal.timeline?.revisionId;
  const body: ContractDraftBody | null = timelineId
    ? {
        expectedRevision: bookingRevision,
        predecessorRevisionId: current?.revisionId ?? null,
        timelineRevisionId: timelineId,
        lines,
      }
    : null;
  const fingerprint = JSON.stringify(body);
  const priced = preview?.fingerprint === fingerprint ? preview.data : null;
  const initial = seed;
  const missing = lines.filter((l) => !choices?.some((c) => keyOf(c) === keyOf(l)));
  const stale = lines.some((l) =>
    choices?.some((c) => keyOf(c) === keyOf(l) && c.sourceRevisionId !== l.sourceRevisionId),
  );
  const invalid =
    bookingRevision !== proposal.revision ||
    !body ||
    lines.length === 0 ||
    lines.length > 50 ||
    !lines.some((l) => l.category === 'MENU') ||
    lines.some(
      (l) =>
        !Number.isSafeInteger(l.quantity) ||
        l.quantity < 1 ||
        l.quantity > (l.category === 'MENU' ? 500 : 10000),
    );
  const update = (choice: CatalogChoice, quantity: number) => {
    setLines((previous) => [
      ...previous.filter((l) => keyOf(l) !== keyOf(choice)),
      ...(quantity > 0
        ? [
            {
              category: choice.category,
              sourceId: choice.sourceId,
              sourceRevisionId: choice.sourceRevisionId,
              quantity,
            },
          ]
        : []),
    ]);
    setPreview(null);
    setError(null);
  };
  async function execute(save: boolean) {
    if (lock.current || !body || invalid || (save && !priced)) return;
    lock.current = true;
    setPending(true);
    setError(null);
    const version = ++epoch.current;
    try {
      if (save) {
        if (attempt.current?.fingerprint !== fingerprint)
          attempt.current = { fingerprint, key: crypto.randomUUID() };
        await contractService.createContractDraft(proposal.bookingId, body, attempt.current.key);
        if (version === epoch.current) {
          notify.success('Đã lưu hợp đồng nháp thành công.');
          onSaved();
        }
      } else {
        const data = await contractService.previewContract(proposal.bookingId, body);
        if (version === epoch.current) setPreview({ fingerprint, data });
      }
    } catch (err) {
      if (version === epoch.current) {
        const msg = describeApiError(err).message;
        setError(msg);
        notify.error(err, { fallbackMessage: msg });
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="flex flex-col gap-4 border-t border-border pt-5"
      aria-label="Soạn hợp đồng từ đề xuất"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold">Hạng mục hợp đồng</h4>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          Đóng bản soạn
        </Button>
      </div>
      <p className="text-muted-foreground">
        Đã điền các hạng mục từ {current ? 'hợp đồng hiện tại' : 'lựa chọn khách đã gửi'}. Chọn thêm
        dịch vụ hoặc thiệp in nếu đã thống nhất với khách. Giá và tổng tiền được máy chủ kiểm tra
        trước khi lưu.
      </p>
      {bookingRevision !== proposal.revision ? (
        <p role="alert" className="rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error">
          Hồ sơ đã thay đổi trong lúc soạn. Đóng bản soạn và mở lại để dùng đúng phiên bản mới nhất.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Tổng dữ liệu điền sẵn:{' '}
        <strong className="text-foreground tabular-nums">{formatVnd(seedTotalVnd)}</strong>. Đây là
        bản nhận ban đầu; dùng “Kiểm tra giá & xem trước” sau khi chỉnh sửa.
      </p>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error"
        >
          <p>{error}</p>
          {!choices ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReload((v) => v + 1)}
            >
              Tải lại danh mục
            </Button>
          ) : null}
        </div>
      ) : null}
      {!choices ? (
        <p role="status" className="text-muted-foreground">
          Đang tải danh mục…
        </p>
      ) : (
        <>
          {!priced ? (
            <>
              {missing.map((line) => (
                <div
                  key={keyOf(line)}
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error"
                >
                  <span>
                    {initial.find((l) => keyOf(l) === keyOf(line))?.name ?? line.sourceId} không còn
                    trong danh mục đang bán. Chọn hạng mục thay thế trước khi lưu.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-hy-error text-hy-error"
                    disabled={pending}
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((l) => keyOf(l) !== keyOf(line)))}
                  >
                    Bỏ hạng mục
                  </Button>
                </div>
              ))}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="bg-muted text-xs">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Hạng mục</th>
                      <th className="px-3 py-2 font-semibold">Đơn giá hiện hành</th>
                      <th className="w-36 px-3 py-2 font-semibold">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {choices.map((choice) => {
                      const selected = lines.find((l) => keyOf(l) === keyOf(choice));
                      return (
                        <tr
                          key={keyOf(choice)}
                          className={cn(
                            'border-t border-border',
                            selected ? 'bg-accent/40' : undefined,
                          )}
                        >
                          <td className="px-3 py-2">
                            <strong className="block font-semibold">{choice.name}</strong>
                            <small className="text-2xs text-muted-foreground">
                              {categoryLabels[choice.category]}
                            </small>
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            <div className="flex flex-wrap items-center gap-2">
                              {formatVnd(choice.unitPriceVnd)}/{choice.unit}
                              {selected && selected.sourceRevisionId !== choice.sourceRevisionId ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() => update(choice, selected.quantity)}
                                >
                                  Dùng giá hiện hành
                                </Button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              className="w-28 tabular-nums"
                              aria-label={'Số lượng ' + choice.name}
                              min={0}
                              max={choice.category === 'MENU' ? 500 : 10000}
                              step={1}
                              value={selected?.quantity ?? 0}
                              disabled={pending}
                              onChange={(event) => update(choice, Number(event.target.value))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {stale ? (
                <p
                  role="alert"
                  className="rounded-lg bg-hy-warning-bg px-4 py-3 text-xs text-hy-warning"
                >
                  Có hạng mục đã đổi phiên bản giá. Chọn “Dùng giá hiện hành” sau khi thống nhất lại
                  với khách; hệ thống không tự đổi giá đã chọn.
                </p>
              ) : null}
            </>
          ) : null}
          {priced ? (
            <div className="flex flex-col gap-3 rounded-lg bg-hy-success-bg p-4">
              <ContractLinesTable lines={priced.document.lines} />
              <p>
                Tổng hợp đồng:{' '}
                <strong className="text-lg text-primary tabular-nums">
                  {formatVnd(priced.document.contractTotalVnd)}
                </strong>{' '}
                · Tiền cọc (
                {(priced.document as any).depositRate ??
                  (priced.document.contractTotalVnd > 0
                    ? Math.round(
                        (priced.document.depositAmountVnd / priced.document.contractTotalVnd) * 100,
                      )
                    : 30)}
                % theo hợp đồng):{' '}
                <strong className="tabular-nums">
                  {formatVnd(priced.document.depositAmountVnd)}
                </strong>
              </p>
              <p className="text-xs">
                Cô dâu: {priced.document.brideName ?? 'Chưa có tên'} · Chú rể:{' '}
                {priced.document.groomName ?? 'Chưa có tên'}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={pending || (!priced && (invalid || missing.length > 0 || stale))}
              onClick={() => {
                if (priced) setPreview(null);
                else void execute(false);
              }}
            >
              {pending
                ? 'Đang xử lý…'
                : priced
                  ? 'Quay lại & chỉnh sửa'
                  : 'Kiểm tra giá & xem trước'}
            </Button>
            <Button
              type="button"
              disabled={pending || !priced || invalid}
              onClick={() => void execute(true)}
            >
              Lưu bản nháp hợp đồng
            </Button>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            Lưu bản nháp chưa gửi khách duyệt. Kiểm tra đủ tên hai bạn và nội dung rồi chọn “Gửi
            duyệt hợp đồng”.
          </p>
        </>
      )}
    </section>
  );
}
