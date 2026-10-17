/**
 * Logo Hỷ Yến: monogram "HY" + tên thương hiệu và định vị.
 *
 * Monogram là chữ Latin không dấu nên dùng `.latin-wordmark` (lang="en")
 * kết hợp Playfair Display. Tên tiếng Việt "Hỷ Yến" dùng sans-serif hệ thống.
 */
export function BrandMark({
  tagline = 'Quản trị nhà hàng',
  compact = false,
}: Readonly<{
  tagline?: string;
  compact?: boolean;
}>) {
  return (
    <span className={'hy-brand' + (compact ? ' hy-brand-compact' : '')}>
      <span className="hy-monogram" aria-hidden="true">
        <span className="latin-wordmark" lang="en">
          HY
        </span>
      </span>
      <span className="hy-brand-text">
        <strong>Hỷ Yến</strong>
        {tagline ? <small>{tagline}</small> : null}
      </span>
    </span>
  );
}
