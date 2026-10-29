'use client';
import { useEffect, useRef, useState } from 'react';
import { describeApiError } from '../../lib/api/api-errors';
import { formatVnd } from '../../lib/formatters';
import {
  contractService,
  type ContractPreview,
  type ContractRevisionItem,
  type ContractDraftBody,
} from '../../services/contract.service';
import type { ProposalView } from './booking-api';
import { loadContractChoices, type CatalogChoice, type DraftLine } from './contract-draft-catalog';
import { ContractLinesTable } from './contract-lines-table';
import styles from './contract-draft-composer.module.css';

const keyOf = (line: Pick<DraftLine, 'category' | 'sourceId'>) =>
  line.category + ':' + line.sourceId.toLowerCase();
const labels = { MENU: 'Thực đơn', SERVICE: 'Dịch vụ', PRINT: 'Thiệp in' };
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
        if (version === epoch.current) onSaved();
      } else {
        const data = await contractService.previewContract(proposal.bookingId, body);
        if (version === epoch.current) setPreview({ fingerprint, data });
      }
    } catch (err) {
      if (version === epoch.current) setError(describeApiError(err).message);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section className={styles.composer} aria-label="Soạn hợp đồng từ đề xuất">
      <div className={styles.heading}>
        <h4>Hạng mục hợp đồng</h4>
        <button
          type="button"
          className="primary-button booking-secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Đóng bản soạn
        </button>
      </div>
      <p>
        Đã điền các hạng mục từ {current ? 'hợp đồng hiện tại' : 'lựa chọn khách đã gửi'}. Chọn thêm
        dịch vụ hoặc thiệp in nếu đã thống nhất với khách. Giá và tổng tiền được máy chủ kiểm tra
        trước khi lưu.
      </p>
      {bookingRevision !== proposal.revision ? (
        <p role="alert">
          Hồ sơ đã thay đổi trong lúc soạn. Đóng bản soạn và mở lại để dùng đúng phiên bản mới nhất.
        </p>
      ) : null}
      <ContractLinesTable
        lines={seed}
        title="Dữ liệu điền sẵn: thực đơn, số bàn & các hạng mục đã chọn"
      />
      <p>
        Tổng dữ liệu điền sẵn: <strong>{formatVnd(seedTotalVnd)}</strong>. Đây là bản nhận ban đầu;
        dùng “Kiểm tra giá & xem trước” sau khi chỉnh sửa.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          {!choices ? (
            <button type="button" onClick={() => setReload((v) => v + 1)}>
              Tải lại danh mục
            </button>
          ) : null}
        </div>
      ) : null}
      {!choices ? (
        <p role="status">Đang tải danh mục…</p>
      ) : (
        <>
          {missing.map((line) => (
            <div key={keyOf(line)} role="alert" className={styles.missing}>
              <span>
                {initial.find((l) => keyOf(l) === keyOf(line))?.name ?? line.sourceId} không còn
                trong danh mục đang bán. Chọn hạng mục thay thế trước khi lưu.
              </span>
              <button
                disabled={pending}
                type="button"
                onClick={() => setLines((prev) => prev.filter((l) => keyOf(l) !== keyOf(line)))}
              >
                Bỏ hạng mục
              </button>
            </div>
          ))}
          <div className={styles.scroll}>
            <table>
              <thead>
                <tr>
                  <th>Hạng mục</th>
                  <th>Đơn giá hiện hành</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {choices.map((choice) => {
                  const selected = lines.find((l) => keyOf(l) === keyOf(choice));
                  return (
                    <tr key={keyOf(choice)}>
                      <td>
                        <strong>{choice.name}</strong>
                        <small>{labels[choice.category]}</small>
                      </td>
                      <td>
                        {formatVnd(choice.unitPriceVnd)}/{choice.unit}
                        {selected && selected.sourceRevisionId !== choice.sourceRevisionId ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => update(choice, selected.quantity)}
                          >
                            Dùng giá hiện hành
                          </button>
                        ) : null}
                      </td>
                      <td>
                        <input
                          type="number"
                          inputMode="numeric"
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
            <p role="alert">
              Có hạng mục đã đổi phiên bản giá. Chọn “Dùng giá hiện hành” sau khi thống nhất lại với
              khách; hệ thống không tự đổi giá đã chọn.
            </p>
          ) : null}
          {priced ? (
            <div className={styles.priced}>
              <ContractLinesTable lines={priced.document.lines} />
              <p>
                Tổng hợp đồng: <strong>{formatVnd(priced.document.contractTotalVnd)}</strong> · Tiền
                cọc: <strong>{formatVnd(priced.document.depositAmountVnd)}</strong>
              </p>
              <p>
                Cô dâu: {priced.document.brideName ?? 'Chưa có tên'} · Chú rể:{' '}
                {priced.document.groomName ?? 'Chưa có tên'}
              </p>
            </div>
          ) : null}
          <div className="booking-actions">
            <button
              type="button"
              className="primary-button booking-secondary"
              disabled={pending || invalid || missing.length > 0 || stale}
              onClick={() => void execute(false)}
            >
              {pending ? 'Đang xử lý…' : 'Kiểm tra giá & xem trước'}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={pending || !priced || invalid}
              onClick={() => void execute(true)}
            >
              Lưu bản nháp hợp đồng
            </button>
          </div>
          <p>
            Lưu bản nháp chưa gửi khách duyệt. Kiểm tra đủ tên hai bạn và nội dung rồi chọn “Gửi
            duyệt hợp đồng”.
          </p>
        </>
      )}
    </section>
  );
}
