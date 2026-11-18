import { createApiClient, type ApiClient } from '@/src/lib/api/client';
import { DEMO_INVITATION_TEMPLATES } from '../data/invitation-templates-fixtures';
import type { InvitationTemplateItem, TemplateDraftForm } from '../types/invitation-templates-types';

export interface InvitationTemplatesGateway {
  list(
    token: string,
    options?: { includeArchived?: boolean; cursor?: string; limit?: number },
  ): Promise<{ items: readonly InvitationTemplateItem[]; nextCursor: string | null }>;
  get(token: string, templateId: string, versionId?: string): Promise<InvitationTemplateItem>;
  create(
    token: string,
    form: TemplateDraftForm,
    idempotencyKey?: string,
  ): Promise<InvitationTemplateItem>;
  revise(
    token: string,
    templateId: string,
    expectedRevision: number,
    form: TemplateDraftForm,
    idempotencyKey?: string,
  ): Promise<InvitationTemplateItem>;
  toggleActive(
    token: string,
    template: InvitationTemplateItem,
    idempotencyKey?: string,
  ): Promise<InvitationTemplateItem>;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

function buildTemplateContent(form: TemplateDraftForm) {
  return {
    title: form.title.trim(),
    derivedAssetIds: [] as readonly string[],
    includesSeating: form.includesSeating,
    sections: [
      { kind: 'HERO' as const, textKey: null, derivedAssetId: null },
      { kind: 'MESSAGE' as const, textKey: 'message' as const, derivedAssetId: null },
      { kind: 'EVENT' as const, textKey: null, derivedAssetId: null },
      { kind: 'TIMELINE' as const, textKey: null, derivedAssetId: null },
      ...(form.includesSeating
        ? [{ kind: 'SEATING' as const, textKey: null, derivedAssetId: null }]
        : []),
      { kind: 'FOOTER' as const, textKey: 'footer' as const, derivedAssetId: null },
    ],
    textFields: {
      greeting: form.greeting.trim() || null,
      message: form.message.trim() || null,
      footer: form.footer.trim() || null,
    },
    presentation: {
      version: 1 as const,
      theme: form.theme,
      layout: form.layout,
      decoration: {
        coverMotif: form.coverMotif,
        insideMotif: form.insideMotif,
        finish: form.finish,
        frame: form.frame,
        coverComposition: 'medallion' as const,
        insideComposition: 'border' as const,
        coverDensity: 'subtle' as const,
        insideDensity: 'subtle' as const,
      },
    },
  };
}

export function createManagementInvitationTemplatesGateway(
  client?: ApiClient,
): InvitationTemplatesGateway {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());

  return {
    async list(token, options) {
      const headers = { Authorization: `Bearer ${token}` };
      const queryParams: Record<string, string> = {
        includeArchived: options?.includeArchived ? 'true' : 'false',
        limit: String(options?.limit ?? 50),
      };
      if (options?.cursor) queryParams.cursor = options.cursor;

      const result = await api().GET('/management/invitation-templates', {
        headers,
        params: { query: queryParams },
      } as never);

      if (result.error) {
        throw new Error(extractErrorMessage(result.error, 'Không thể tải danh sách mẫu thiệp.'));
      }
      const data = result.data as
        | { data: { items: readonly InvitationTemplateItem[]; nextCursor: string | null } }
        | undefined;
      if (!data) throw new Error('Không thể tải danh sách mẫu thiệp.');
      return data.data;
    },

    async get(token, templateId, versionId) {
      const headers = { Authorization: `Bearer ${token}` };
      const result = await api().GET('/management/invitation-templates/{templateId}', {
        headers,
        params: {
          path: { templateId },
          query: versionId ? { versionId } : undefined,
        },
      } as never);
      if (result.error) {
        throw new Error(extractErrorMessage(result.error, 'Không tìm thấy thông tin mẫu thiệp.'));
      }
      const data = result.data as { data: InvitationTemplateItem } | undefined;
      if (!data) throw new Error('Không tìm thấy thông tin mẫu thiệp.');
      return data.data;
    },

    async create(token, form, idempotencyKey = crypto.randomUUID()) {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      };
      const result = await api().POST('/management/invitation-templates', {
        headers,
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: {
          active: form.active,
          expectedRevision: 0,
          content: buildTemplateContent(form),
        },
      } as never);
      if (result.error) {
        throw new Error(extractErrorMessage(result.error, 'Không thể tạo mẫu thiệp.'));
      }
      const data = result.data as { data: InvitationTemplateItem } | undefined;
      if (!data) throw new Error('Không thể tạo mẫu thiệp.');
      return data.data;
    },

    async revise(token, templateId, expectedRevision, form, idempotencyKey = crypto.randomUUID()) {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      };
      const result = await api().PATCH('/management/invitation-templates/{templateId}', {
        headers,
        params: {
          path: { templateId },
          header: { 'Idempotency-Key': idempotencyKey },
        },
        body: {
          active: form.active,
          expectedRevision,
          content: buildTemplateContent(form),
        },
      } as never);
      if (result.error) {
        throw new Error(extractErrorMessage(result.error, 'Không thể cập nhật mẫu thiệp.'));
      }
      const data = result.data as { data: InvitationTemplateItem } | undefined;
      if (!data) throw new Error('Không thể cập nhật mẫu thiệp.');
      return data.data;
    },

    async toggleActive(token, template, idempotencyKey = crypto.randomUUID()) {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      };
      const nextActive = !template.active;
      const result = await api().PATCH('/management/invitation-templates/{templateId}', {
        headers,
        params: {
          path: { templateId: template.templateId },
          header: { 'Idempotency-Key': idempotencyKey },
        },
        body: {
          active: nextActive,
          expectedRevision: template.revisionNumber,
          content: {
            title: template.title,
            derivedAssetIds: [],
            includesSeating: template.includesSeating,
            sections: template.sections,
            textFields: template.textFields,
            ...(template.presentation ? { presentation: template.presentation } : {}),
          },
        },
      } as never);
      if (result.error) {
        throw new Error(
          extractErrorMessage(result.error, 'Không thể thay đổi trạng thái mẫu thiệp.'),
        );
      }
      const data = result.data as { data: InvitationTemplateItem } | undefined;
      if (!data) throw new Error('Không thể thay đổi trạng thái mẫu thiệp.');
      return data.data;
    },
  };
}

export function createFixtureInvitationTemplatesGateway(
  initialItems: readonly InvitationTemplateItem[] = DEMO_INVITATION_TEMPLATES,
): InvitationTemplatesGateway {
  let items = [...initialItems];

  return {
    list(_token, options) {
      const filtered = options?.includeArchived ? items : items.filter((item) => item.active);
      return Promise.resolve({ items: filtered, nextCursor: null });
    },
    get(_token, templateId) {
      const item = items.find((t) => t.templateId === templateId);
      if (!item) return Promise.reject(new Error('Mẫu thiệp không tồn tại (Mock).'));
      return Promise.resolve(item);
    },
    create(_token, form) {
      const newItem: InvitationTemplateItem = {
        templateId: crypto.randomUUID(),
        versionId: crypto.randomUUID(),
        revisionNumber: 1,
        active: form.active,
        ...buildTemplateContent(form),
      };
      items = [newItem, ...items];
      return Promise.resolve(newItem);
    },
    revise(_token, templateId, _expectedRevision, form) {
      const index = items.findIndex((t) => t.templateId === templateId);
      if (index === -1) return Promise.reject(new Error('Mẫu thiệp không tồn tại.'));
      const current = items[index];
      if (!current) return Promise.reject(new Error('Mẫu thiệp không tồn tại.'));
      const updated: InvitationTemplateItem = {
        ...current,
        revisionNumber: current.revisionNumber + 1,
        versionId: crypto.randomUUID(),
        active: form.active,
        ...buildTemplateContent(form),
      };
      items[index] = updated;
      return Promise.resolve(updated);
    },
    toggleActive(_token, template) {
      const index = items.findIndex((t) => t.templateId === template.templateId);
      if (index === -1) return Promise.reject(new Error('Mẫu thiệp không tồn tại.'));
      const current = items[index];
      if (!current) return Promise.reject(new Error('Mẫu thiệp không tồn tại.'));
      const updated: InvitationTemplateItem = {
        ...current,
        revisionNumber: current.revisionNumber + 1,
        active: !current.active,
      };
      items[index] = updated;
      return Promise.resolve(updated);
    },
  };
}
