import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

// Hỷ Yến v3 StatusChip: luôn kèm chữ trạng thái, màu chỉ để hỗ trợ.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-1 text-2xs font-medium whitespace-nowrap transition-all before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        neutral: 'bg-secondary text-muted-foreground',
        brand: 'bg-accent text-accent-foreground',
        success: 'bg-hy-success-bg text-hy-success',
        warning: 'bg-hy-warning-bg text-hy-warning',
        error: 'bg-hy-error-bg text-hy-error',
        info: 'bg-hy-info-bg text-hy-info',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

function Badge({
  className,
  variant = 'neutral',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
