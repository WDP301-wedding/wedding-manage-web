type SkeletonVariant = 'page' | 'list' | 'card' | 'table';

const shapes: Record<SkeletonVariant, readonly string[]> = {
  page: ['title', 'line', 'card', 'card'],
  list: ['row', 'row', 'row', 'row', 'row'],
  card: ['title', 'line', 'line'],
  table: ['header', 'row', 'row', 'row', 'row'],
};

export function Skeleton({
  label = 'Đang tải dữ liệu…',
  variant = 'page',
}: Readonly<{
  label?: string;
  variant?: SkeletonVariant;
}>) {
  return (
    <div className={`hy-skeleton hy-skeleton-${variant}`} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {shapes[variant].map((shape, index) => (
        <span key={index} className={`hy-skel hy-skel-${shape}`} aria-hidden="true" />
      ))}
    </div>
  );
}
