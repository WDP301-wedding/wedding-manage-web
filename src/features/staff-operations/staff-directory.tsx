import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { staffService, type DirectoryStaff } from '../../services/staff.service';
import { notify } from '../../design-system/notifications';
import { describeApiError } from '../../lib/api/api-errors';
import { staffCommand } from './staff-command-intents';
import type { StaffReasonAction } from './staff-reason-dialog';

export function StaffDirectory({
  selectedId,
  onSelect,
  pending,
  accountId,
  onReason,
  onChanged,
}: Readonly<{
  selectedId: string;
  onSelect: (id: string, label: string, setup: boolean) => void;
  pending: boolean;
  accountId: string;
  onReason: StaffReasonAction;
  onChanged: () => Promise<void>;
}>) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<Awaited<ReturnType<typeof staffService.directory>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const load = async (term: string, afterId?: string) => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await staffService.directory(term, afterId);
      if (version === request.current)
        setPage((previous) => ({
          ...result,
          items: afterId ? [...(previous?.items ?? []), ...result.items] : result.items,
        }));
    } catch (cause) {
      if (version === request.current) setError(describeApiError(cause).message);
    } finally {
      if (version === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load('');
    return () => {
      request.current++;
    };
  }, []);
  const disable = (person: DirectoryStaff) =>
    onReason(`Tắt quyền tác nghiệp của ${person.email} trên mọi tiệc?`, async (reason) => {
      const body = { enabled: false, reason };
      await staffCommand(`${accountId}:staff-access:${person.accountId}`, body, (key) =>
        staffService.setOperationalAccess(person.accountId, false, reason, key),
      );
      if (selectedId === person.accountId) onSelect('', '', false);
      setPage(
        (previous) =>
          previous && {
            ...previous,
            items: previous.items.filter((item) => item.accountId !== person.accountId),
          },
      );
      await Promise.all([load(query), onChanged()]);
    });
  return (
    <div className="grid gap-2">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || loading) return;
          const term = input.trim();
          setQuery(term);
          setPage(null);
          void load(term);
        }}
      >
        <label className="grid min-w-48 flex-1 gap-1 text-sm">
          Tìm nhân viên theo email
          <Input value={input} onChange={(event) => setInput(event.target.value)} maxLength={120} />
        </label>
        <Button type="submit" variant="outline" disabled={loading || pending}>
          Tìm nhân viên
        </Button>
      </form>
      {loading && (
        <p role="status" className="text-sm">
          Đang tải danh bạ…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {page?.items.length === 0 && !loading && !error && (
        <p className="text-sm text-muted-foreground">Không tìm thấy nhân viên phù hợp.</p>
      )}
      {page && page.items.length > 0 && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {page.items.map((person) => (
            <li key={person.accountId} className="flex flex-wrap items-center gap-2 p-2">
              <button
                type="button"
                disabled={pending || loading}
                aria-pressed={selectedId === person.accountId}
                className="min-w-0 flex-1 rounded px-2 py-1 text-left text-sm break-all hover:bg-muted aria-pressed:bg-accent"
                onClick={() =>
                  onSelect(person.accountId, person.email, person.credentialSetupRequired)
                }
              >
                {person.email}
                {person.credentialSetupRequired && (
                  <span className="block text-xs text-muted-foreground">
                    Chưa thiết lập mật khẩu
                  </span>
                )}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || loading}
                onClick={() => disable(person)}
              >
                Tắt quyền
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextAfterId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || pending}
          onClick={() => void load(query, page.nextAfterId ?? undefined)}
        >
          Tải thêm nhân viên
        </Button>
      )}
    </div>
  );
}
