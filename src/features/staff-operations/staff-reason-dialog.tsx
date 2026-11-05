import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { notify } from '../../design-system/notifications';

export type StaffReasonAction = (title: string, submit: (reason: string) => Promise<void>) => void;

export function StaffReasonDialog({
  title,
  onSubmit,
  onClose,
}: Readonly<{
  title: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-card p-5 text-foreground shadow-hy-2 backdrop:bg-hy-ink/40"
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy.current || reason.trim().length < 10) return;
          busy.current = true;
          setPending(true);
          try {
            await onSubmit(reason.trim());
            onClose();
          } catch (error) {
            notify.error(error);
          } finally {
            busy.current = false;
            setPending(false);
          }
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <label className="grid gap-1.5 text-sm">
          Lý do (ít nhất 10 ký tự)
          <Textarea
            required
            minLength={10}
            maxLength={500}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Quay lại
          </Button>
          <Button type="submit" disabled={pending || reason.trim().length < 10}>
            Xác nhận
          </Button>
        </div>
      </form>
    </dialog>
  );
}
