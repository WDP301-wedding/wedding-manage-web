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
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang xử lý…' : submitLabel}
        </Button>
        <small className="text-xs text-muted-foreground">
          Access token chỉ tồn tại trong bộ nhớ của trang này.
        </small>
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
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          className={cn(className, password && 'pr-12') || undefined}
          required
        />
        {password ? (
          <button
            className="absolute top-0.5 right-0.5 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
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
