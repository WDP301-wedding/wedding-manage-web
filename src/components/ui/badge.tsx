import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

// Hỷ Yến v3 StatusChip: tinh tế, phong cách agency tiệc cưới cao cấp, viền 1px sắc nét.
const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-secondary text-muted-foreground',
        brand: 'border-hy-wine/20 bg-accent text-accent-foreground',
        success: 'border-[#bbf7d0] bg-hy-success-bg text-hy-success',
        warning: 'border-[#fef08a] bg-hy-warning-bg text-hy-warning',
        error: 'border-[#fecaca] bg-hy-error-bg text-hy-error',
        info: 'border-[#bfdbfe] bg-hy-info-bg text-hy-info',
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
