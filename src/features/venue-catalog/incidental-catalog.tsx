'use client';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import type { operations } from '../../lib/api/generated/schema';
import type { Authorize } from './catalog-tabs';
import { axiosApiClient } from '../../lib/api/axios-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { notify } from '../../design-system/notifications';
import { formatVnd } from '../../lib/formatters';

type Item =
  operations['listManagedIncidentalOfferings']['responses'][200]['content']['application/json']['data']['items'][number];
type Draft = Pick<
  Item,
  'name' | 'description' | 'unit' | 'unitPriceVnd' | 'chargingRule' | 'active'
>;
const empty: Draft = {
  name: '',
  description: '',
  unit: '',
  unitPriceVnd: 0,
  chargingRule: '',
  active: true,
};
export function IncidentalCatalog({ authorize }: { authorize: Authorize }) {
  const [items, setItems] = useState<readonly Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const all: Item[] = [];
      let cursor: string | null = null;
      do {
        const response = await authorize((token) =>
          axiosApiClient.get<{ data: { items: Item[]; nextCursor: string | null } }>(
            '/management/incidental-offerings',
            {
              params: { limit: 50, ...(cursor ? { cursor } : {}) },
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
        );
        all.push(...response.data.data.items);
        cursor = response.data.data.nextCursor;
      } while (cursor);
      setItems(all);
      setError(null);
    } catch {
      setError('Chưa tải được danh mục chi phí phát sinh.');
    }
  }, [authorize]);
  useLiveRefresh(
    async () => {
      await load();
    },
    { scope: 'incidental-catalog', types: ['catalog.updated'], initial: true },
  );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const body = { ...draft, ...(editing ? { expectedRevision: editing.revision } : {}) };
    const fingerprint = JSON.stringify([editing?.offeringId, body]);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setPending(true);
    try {
      await authorize((token) =>
        axiosApiClient.request({
          method: editing ? 'PATCH' : 'POST',
          url: '/management/incidental-offerings' + (editing ? `/${editing.offeringId}` : ''),
          data: body,
          headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': intent.current!.key },
        }),
      );
      intent.current = null;
      setDraft(empty);
      setEditing(null);
      await load();
      notify.success('Đã lưu. Thay đổi áp dụng cho booking tạo sau này.');
    } catch (cause) {
      notify.error(cause);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      aria-label="Danh mục chi phí phát sinh"
    >
      <h2 className="text-xl font-semibold">Danh mục chi phí phát sinh</h2>
      <p className="text-sm text-muted-foreground">
        Booking mới lưu bảng giá khi tạo và đưa vào hợp đồng. Sửa giá hoặc ngừng sử dụng không thay
        đổi booking đã có.
      </p>
      <p className="text-sm">
        Gợi ý: bia theo loại, nước ngọt, nước suối, đá viên, khăn lạnh, ly/chén vỡ, phục vụ quá giờ.
        Ghi rõ quy cách và cách tính.
      </p>
      {error ? (
        <p role="alert">
          {error} <button onClick={() => void load()}>Thử lại</button>
        </p>
      ) : null}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-3">
          <thead>
            <tr>
              <th>Hạng mục</th>
              <th>Đơn giá</th>
              <th>Cách tính</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.offeringId} className="border-t border-border">
                <td className="max-w-64 break-words">
                  {item.name}
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </td>
                <td>
                  {formatVnd(item.unitPriceVnd)}/{item.unit}
                </td>
                <td className="max-w-64 break-words">{item.chargingRule}</td>
                <td>{item.active ? 'Đang sử dụng' : 'Đã ngừng'}</td>
                <td>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setEditing(item);
                      setDraft({
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        unitPriceVnd: item.unitPriceVnd,
                        chargingRule: item.chargingRule,
                        active: item.active,
                      });
                    }}
                  >
                    Sửa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={(event) => void save(event)} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <h3 className="min-w-0 font-semibold break-words sm:col-span-2">
          {editing ? `Sửa ${editing.name}` : 'Thêm hạng mục'}
        </h3>
        {(['name', 'description', 'unit', 'chargingRule'] as const).map((key) => (
          <label key={key} className="flex min-w-0 flex-col gap-1 text-sm">
            {
              {
                name: 'Tên hạng mục',
                description: 'Mô tả / quy cách',
                unit: 'Đơn vị tính',
                chargingRule: 'Quy tắc tính phí',
              }[key]
            }
            <Input
              required
              maxLength={
                key === 'description'
                  ? 2000
                  : key === 'chargingRule'
                    ? 1000
                    : key === 'name'
                      ? 120
                      : 80
              }
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          Đơn giá (VND)
          <Input
            type="number"
            min={0}
            step={1}
            required
            value={draft.unitPriceVnd}
            onChange={(e) => setDraft({ ...draft, unitPriceVnd: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Đang sử dụng cho booking mới
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button disabled={pending} type="submit">
            {pending ? 'Đang lưu…' : 'Lưu hạng mục'}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDraft(empty);
              }}
            >
              Hủy chỉnh sửa
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
