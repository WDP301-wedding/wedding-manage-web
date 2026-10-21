'use client';

import { useState } from 'react';
import { dashboardStyles } from './dashboard.styles';

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
      style={dashboardStyles.copyButton(copied)}
      aria-label="Sao chép UUID"
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
