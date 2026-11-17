'use client';

import { type FormEvent, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function AuthForm({
  children,
  onSubmit,
  pending,
  submitLabel,
  title,
}: Readonly<{
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  title: string;
}>) {
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">
          Nhập thông tin xác thực để vào hệ thống vận hành Hỷ Yến.
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground transition-colors hover:bg-hy-wine-pressed"
        >
          {pending ? 'Đang xác thực thông tin…' : submitLabel}
        </Button>
        <div className="flex items-center justify-between text-2xs text-muted-foreground">
          <span>Khu vực bảo mật ca trực</span>
          <span>Bảo mật 256-bit</span>
        </div>
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  className,
  ...input
}: Readonly<InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = input.type === 'password';
  const id = `operations-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          className={cn(
            'h-11 rounded-md border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
            password && 'pr-11',
            className,
          )}
          required
        />
        {password ? (
          <button
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
