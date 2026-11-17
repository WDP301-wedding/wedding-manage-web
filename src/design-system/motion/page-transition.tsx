'use client';

import * as React from 'react';
import type { ReactNode } from 'react';

type ViewTransitionProps = Readonly<{
  enter?: string;
  exit?: string;
  default?: string;
  children: ReactNode;
}>;

// React đi kèm Next 16 có <ViewTransition>; React chạy test (jsdom) chưa có nên rơi về Fragment.
const ViewTransition = (
  React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }
).ViewTransition;

/** Nội dung chính hiện dần khi đổi trang; thanh menu đứng yên. CSS: `.hy-page-in`, `.hy-page-out` trong ui-v3.css. */
export function PageTransition({ children }: Readonly<{ children: ReactNode }>) {
  if (!ViewTransition) return <>{children}</>;
  return (
    <ViewTransition enter="hy-page-in" exit="hy-page-out" default="none">
      {children}
    </ViewTransition>
  );
}
