import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

export function AppendixCancellationForm({
  disabled,
  onCancel,
}: Readonly<{
  disabled: boolean;
  onCancel: (reason: string) => Promise<boolean>;
}>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!open)
    return (
      <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        Hủy đề xuất phụ lục
      </Button>
    );
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && reason.trim())
          void onCancel(reason.trim()).then((ok) => {
            if (ok) setOpen(false);
          });
      }}
    >
      <p className="text-xs text-muted-foreground">
        Đề xuất này sẽ ngừng áp dụng. Nội dung và lịch sử duyệt vẫn được lưu; thỏa thuận đang có
        hiệu lực không đổi.
      </p>
      <label className="text-xs font-semibold">
        Lý do hủy đề xuất phụ lục
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          maxLength={500}
          disabled={disabled}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled || !reason.trim()}>
          Xác nhận hủy đề xuất
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => setOpen(false)}>
          Giữ đề xuất
        </Button>
      </div>
    </form>
  );
}
