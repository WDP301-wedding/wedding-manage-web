'use client';

import { useRef } from 'react';
import type { TemplateVersion } from './template-record-table';

type CloneIntent = { versionId: string; sourceVersionId: string; idempotencyKey: string };

/** No mutation until Save. Retries reuse the clone intent, including after a lost response. */
export function useTemplateDraft(version: TemplateVersion) {
  const draft = useRef(
    version.state === 'DRAFT' ? { id: version.id, revision: version.revision } : null,
  );
  const intent = useRef<CloneIntent | null>(null);
  return {
    async prepare(clone: (input: CloneIntent) => Promise<void>) {
      if (draft.current === null) {
        intent.current ??= {
          versionId: crypto.randomUUID(),
          sourceVersionId: version.id,
          idempotencyKey: crypto.randomUUID(),
        };
        await clone(intent.current);
        draft.current = { id: intent.current.versionId, revision: 1 };
      }
      return draft.current;
    },
    saved() {
      if (draft.current) draft.current = { ...draft.current, revision: draft.current.revision + 1 };
    },
  };
}
