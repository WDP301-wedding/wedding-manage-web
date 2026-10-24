'use client';

import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { managementSessionRevokedEvent } from './session';

/** Navigation belongs to the router; the session service only clears authority. */
export function SessionRevocationBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const revoked = () => {
      // Remount consumers so snapshots captured before revocation are discarded,
      // including when the current route is already the login entry route.
      setGeneration(value => value + 1);
      router.replace('/');
    };
    window.addEventListener(managementSessionRevokedEvent, revoked);
    return () => window.removeEventListener(managementSessionRevokedEvent, revoked);
  }, [router]);
  return <Fragment key={generation}>{children}</Fragment>;
}
