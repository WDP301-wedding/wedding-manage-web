'use client';

import { Plus, RefreshCw, Search } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { InvitationTemplateCard } from '../components/invitation-template-card';
import { InvitationTemplateDialog } from '../components/invitation-template-dialog';
import { useInvitationTemplates } from '../hooks/use-invitation-templates';
import type { InvitationTemplatesGateway } from '../api/invitation-templates-api';

interface InvitationTemplatesWorkspaceProps {
  gateway: InvitationTemplatesGateway;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  isFixtureMode?: boolean;
}

export function InvitationTemplatesWorkspace({
  gateway,
  authorize,
  isFixtureMode = false,
}: InvitationTemplatesWorkspaceProps) {
  const {
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
    refresh,
  } = useInvitationTemplates({ gateway, authorize, isFixtureMode });

  return (
    <section data-ui-v3 className="flex flex-col gap-6">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Mẫu thiệp cưới</h2>
            {isFixtureMode ? <Badge variant="info">Dữ liệu mẫu</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Quản lý kiểu dáng, họa tiết trang trí và chủ đề màu sắc cho thiệp mời trực tuyến & bản in.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || isSubmitting}
            title="Làm mới danh sách mẫu thiệp"
          >
            <RefreshCw
              aria-hidden
              className={cn('size-3.5', loading && 'motion-safe:animate-spin')}
            />
            {loading ? 'Đang tải…' : 'Làm mới'}
          </Button>

          <Button onClick={openCreateDialog} size="sm" className="gap-1.5 font-medium shadow-hy-1">
            <Plus className="size-4" />
            Thêm mẫu thiệp
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-hy-1">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => setFilter('all')}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'active'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => setFilter('active')}
          >
            Đang sử dụng ({counts.active})
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'archived'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => setFilter('archived')}
          >
            Đã lưu trữ ({counts.archived})
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên mẫu, chủ đề..."
            className="pl-8.5 h-9 text-xs"
          />
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Đã xảy ra lỗi khi tải danh sách mẫu thiệp:</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : null}

      {/* Loading Skeletons */}
      {loading && !filteredTemplates.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <div className="flex justify-between pt-3">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Template Cards Grid */}
      {!loading || filteredTemplates.length ? (
        filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => (
              <InvitationTemplateCard
                key={template.templateId}
                template={template}
                onEdit={openEditDialog}
                onToggleActive={handleToggleActive}
                isActionPending={isSubmitting}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm font-medium text-foreground">Không tìm thấy mẫu thiệp nào</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? `Không có kết quả nào phù hợp với từ khóa "${searchQuery}".`
                : 'Chưa có mẫu thiệp nào trong danh mục này.'}
            </p>
            {!searchQuery && filter !== 'all' ? (
              <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => setFilter('all')}>
                Xem tất cả mẫu
              </Button>
            ) : null}
          </div>
        )
      ) : null}

      {/* Create / Edit Dialog */}
      <InvitationTemplateDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onSubmit={handleSaveTemplate}
        initialTemplate={editingTemplate}
        isSubmitting={isSubmitting}
      />
    </section>
  );
}
