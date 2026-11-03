'use client';

import { useRef } from 'react';
import type { DishVersion, MenuVersion } from './food-catalog-shared';

type CloneAttempt = { versionId: string; sourceVersionId: string; idempotencyKey: string };

/** Remember a save intent even if the clone committed but its HTTP response was lost. */
export function useFoodDraft(version: DishVersion | MenuVersion) {
  const draft = useRef(
    version.state === 'DRAFT' ? { id: version.id, revision: version.revision } : null,
  );
  const attempt = useRef<CloneAttempt | null>(null);
  return async (clone: (input: CloneAttempt) => Promise<void>) => {
    if (
      draft.current === null &&
      version.state === 'DRAFT' &&
      version.id === attempt.current?.versionId
    ) {
      draft.current = { id: version.id, revision: version.revision };
    }
    if (draft.current === null) {
      attempt.current ??= {
        versionId: crypto.randomUUID(),
        sourceVersionId: version.id,
        idempotencyKey: crypto.randomUUID(),
      };
      await clone(attempt.current);
      draft.current = { id: attempt.current.versionId, revision: 1 };
    }
    return draft.current;
  };
}
