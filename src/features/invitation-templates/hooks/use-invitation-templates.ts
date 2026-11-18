'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { notify } from '@/src/design-system/notifications/index';
import type { InvitationTemplatesGateway } from '../api/invitation-templates-api';
import type {
  InvitationTemplateItem,
  TemplateDraftForm,
} from '../types/invitation-templates-types';

export type TemplateFilterStatus = 'all' | 'active' | 'archived';

interface UseInvitationTemplatesOptions {
  gateway: InvitationTemplatesGateway;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  isFixtureMode?: boolean;
}

export function useInvitationTemplates({
  gateway,
  authorize,
  isFixtureMode = false,
}: UseInvitationTemplatesOptions) {
  const [templates, setTemplates] = useState<readonly InvitationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<TemplateFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvitationTemplateItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authorize(async (token) => {
        return gateway.list(token, { includeArchived: true });
      });
      setTemplates(res.items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách mẫu thiệp.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [gateway, authorize]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      // 1. Status filter
      if (filter === 'active' && !item.active) return false;
      if (filter === 'archived' && item.active) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const themeMatch = item.presentation?.theme?.toLowerCase().includes(query);
        const layoutMatch = item.presentation?.layout?.toLowerCase().includes(query);
        if (!titleMatch && !themeMatch && !layoutMatch) return false;
      }
      return true;
    });
  }, [templates, filter, searchQuery]);

  const counts = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const item of templates) {
      if (item.active) active++;
      else archived++;
    }
    return { all: templates.length, active, archived };
  }, [templates]);

  const openCreateDialog = useCallback(() => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((template: InvitationTemplateItem) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (!isSubmitting) {
      setIsDialogOpen(false);
      setEditingTemplate(null);
    }
  }, [isSubmitting]);

  const handleSaveTemplate = useCallback(
    async (form: TemplateDraftForm, existing?: InvitationTemplateItem) => {
      setIsSubmitting(true);
      try {
        if (existing) {
          const updated = await authorize((token) =>
            gateway.revise(token, existing.templateId, existing.revisionNumber, form),
          );
          setTemplates((prev) =>
            prev.map((item) => (item.templateId === updated.templateId ? updated : item)),
          );
          notify.success(`Đã cập nhật mẫu thiệp "${updated.title}".`);
        } else {
          const created = await authorize((token) => gateway.create(token, form));
          setTemplates((prev) => [created, ...prev]);
          notify.success(`Đã tạo mới mẫu thiệp "${created.title}".`);
        }
        setIsDialogOpen(false);
        setEditingTemplate(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi lưu mẫu thiệp.';
        notify.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gateway, authorize],
  );

  const handleToggleActive = useCallback(
    async (template: InvitationTemplateItem) => {
      setIsSubmitting(true);
      try {
        const updated = await authorize((token) => gateway.toggleActive(token, template));
        setTemplates((prev) =>
          prev.map((item) => (item.templateId === updated.templateId ? updated : item)),
        );
        notify.success(
          updated.active
            ? `Đã kích hoạt lại mẫu "${updated.title}".`
            : `Đã chuyển mẫu "${updated.title}" sang trạng thái lưu trữ.`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi thay đổi trạng thái mẫu thiệp.';
        notify.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [gateway, authorize],
  );

  return {
    templates,
    filteredTemplates,
    loading,
    error,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    counts,
    isDialogOpen,
    editingTemplate,
    isSubmitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSaveTemplate,
    handleToggleActive,
    refresh: loadTemplates,
  };
}
