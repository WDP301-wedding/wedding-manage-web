'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from 'cn';

export function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Đã sao chép UUID!' : 'Sao chép mã UUID'}
      aria-label="Sao chép UUID"
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        copied && 'text-hy-success hover:text-hy-success',
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 motion-safe:animate-in motion-safe:zoom-in-75" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </button>
  );
}
