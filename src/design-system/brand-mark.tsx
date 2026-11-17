import Image from 'next/image';
import { cn } from 'cn';


export function BrandMark({
  tagline = 'Quản trị nhà hàng',
  compact = false,
  iconOnly = false,
}: Readonly<{
  tagline?: string | undefined;
  compact?: boolean;
  iconOnly?: boolean;
}>) {
  return (
    <span className="flex items-center gap-3 text-foreground overflow-hidden">
      <Image
        src="/images/hy-yen-logo.png"
        alt=""
        width={394}
        height={414}
        className={cn(
          'object-contain shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          compact ? 'h-8 w-auto' : 'h-10 w-auto',
        )}
      />
      <span
        className={cn(
          'flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          iconOnly
            ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
            : 'max-w-[200px] opacity-100 translate-x-0',
        )}
      >
        <strong className={cn('font-bold leading-tight', compact ? 'text-sm' : 'text-base')}>
          Hỷ Yến
        </strong>
        {tagline ? (
          <small
            className={cn(
              'text-muted-foreground leading-normal',
              compact ? 'text-2xs' : 'text-xs',
            )}
          >
            {tagline}
          </small>
        ) : null}
      </span>
    </span>
  );
}
