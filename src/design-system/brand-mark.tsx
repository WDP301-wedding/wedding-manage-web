import Image from 'next/image';
import { cn } from 'cn';

/**
 * Logo Hỷ Yến: ảnh logo (monogram "Hy" + hoa) + tên thương hiệu và định vị.
 *
 * Ảnh chỉ là trang trí (alt rỗng) vì tên "Hỷ Yến" đã có ngay bên cạnh dưới dạng chữ.
 * Logo luôn đặt trên nền sáng (Design System Hỷ Yến v3).
 */
export function BrandMark({
  tagline = 'Quản trị nhà hàng',
  compact = false,
}: Readonly<{
  tagline?: string;
  compact?: boolean;
}>) {
  return (
    <span className="flex items-center gap-3 text-foreground">
      <Image
        src="/images/hy-yen-logo.png"
        alt=""
        width={394}
        height={414}
        className={cn('object-contain', compact ? 'h-8 w-auto' : 'h-11 w-auto')}
      />
      <span className="flex flex-col">
        <strong className={cn('font-bold', compact ? 'text-sm' : 'text-base')}>Hỷ Yến</strong>
        {tagline ? (
          <small className={cn('text-muted-foreground', compact ? 'text-2xs' : 'text-xs')}>
            {tagline}
          </small>
        ) : null}
      </span>
    </span>
  );
}
