import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';

export interface InputProps extends React.ComponentProps<'input'> {
  fieldSize?: 'default' | 'sm';
}

function Input({ className, type, fieldSize = 'default', ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 rounded-lg border border-input bg-card py-1 text-foreground transition-colors outline-none hover:border-muted-foreground/60 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        fieldSize === 'sm' ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
