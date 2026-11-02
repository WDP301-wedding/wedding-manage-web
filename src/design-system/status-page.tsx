import type { ReactNode } from 'react';
import { BrandMark } from './brand-mark';

/** Khung trang trạng thái (404, lỗi) dùng chung: logo, tiêu đề, mô tả và nút điều hướng. */
export function StatusPage({
  title,
  description,
  children,
}: Readonly<{ title: string; description: ReactNode; children: ReactNode }>) {
  return (
    <main
      data-ui-v3
      className="grid min-h-dvh place-items-center bg-background p-[clamp(1rem,4vw,3rem)] text-foreground"
    >
      <section
        role="alert"
        className="flex w-full max-w-[36rem] flex-col gap-4 leading-relaxed animate-in duration-300 fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
      >
        <BrandMark />
        <h1 className="text-2xl leading-snug font-bold">{title}</h1>
        <div className="text-sm text-muted-foreground">{description}</div>
        <div className="mt-2 flex flex-wrap gap-3">{children}</div>
      </section>
    </main>
  );
}
