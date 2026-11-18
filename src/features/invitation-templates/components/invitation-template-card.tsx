'use client';

import { Archive, CheckCircle2, Edit2, Layout, Palette, Sparkles, XCircle } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  FINISH_OPTIONS,
  FRAME_OPTIONS,
  LAYOUT_OPTIONS,
  MOTIF_OPTIONS,
  THEME_OPTIONS,
  type InvitationTemplateItem,
} from '../types/invitation-templates-types';

interface InvitationTemplateCardProps {
  template: InvitationTemplateItem;
  onEdit: (template: InvitationTemplateItem) => void;
  onToggleActive: (template: InvitationTemplateItem) => void;
  isActionPending?: boolean;
}

export function InvitationTemplateCard({
  template,
  onEdit,
  onToggleActive,
  isActionPending = false,
}: InvitationTemplateCardProps) {
  const presentation = template.presentation;
  const themeConfig = THEME_OPTIONS.find((t) => t.id === presentation?.theme);
  const layoutConfig = LAYOUT_OPTIONS.find((l) => l.id === presentation?.layout);
  const finishConfig = FINISH_OPTIONS.find((f) => f.id === presentation?.decoration?.finish);
  const frameConfig = FRAME_OPTIONS.find((f) => f.id === presentation?.decoration?.frame);
  const coverMotifConfig = MOTIF_OPTIONS.find(
    (m) => m.id === presentation?.decoration?.coverMotif,
  );

  return (
    <article
      data-ui-v3
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-hy-1 transition-all duration-200 hover:border-primary/40 hover:shadow-hy-2"
    >
      {/* Top Palette Color Stripe */}
      <div className="absolute inset-x-0 top-0 flex h-2">
        {themeConfig?.palette.map((color, idx) => (
          <span key={idx} className="h-full flex-1" style={{ backgroundColor: color }} />
        )) ?? <span className="h-full w-full bg-primary/20" />}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {/* Header Badges & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={template.active ? 'success' : 'neutral'}>
              {template.active ? (
                <>
                  <CheckCircle2 className="size-3" />
                  Đang sử dụng
                </>
              ) : (
                <>
                  <XCircle className="size-3" />
                  Đã lưu trữ
                </>
              )}
            </Badge>
            <span className="text-2xs text-muted-foreground font-mono">
              Rev.{template.revisionNumber}
            </span>
          </div>
          {template.includesSeating ? (
            <Badge variant="neutral" className="text-2xs">
              Kèm sơ đồ bàn
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
          {template.title}
        </h3>

        {/* Presentation Metadata */}
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <Palette className="size-3.5 shrink-0 text-primary" />
            <span className="font-medium">{themeConfig?.label ?? 'Mặc định'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layout className="size-3.5 shrink-0" />
            <span>Kiểu: {layoutConfig?.label.split('(')[0]?.trim() ?? presentation?.layout}</span>
          </div>
          {finishConfig || coverMotifConfig ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" />
              <span>
                {coverMotifConfig?.label ?? ''}
                {finishConfig ? ` · ${finishConfig.label.split('(')[0]?.trim()}` : ''}
                {frameConfig ? ` · ${frameConfig.label.split('(')[0]?.trim()}` : ''}
              </span>
            </div>
          ) : null}
        </div>

        {/* Sample text message preview */}
        {template.textFields.greeting || template.textFields.message ? (
          <p className="line-clamp-2 text-xs italic text-muted-foreground">
            &ldquo;{template.textFields.greeting || template.textFields.message}&rdquo;
          </p>
        ) : null}
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => onEdit(template)}
          disabled={isActionPending}
        >
          <Edit2 className="size-3.5" />
          Chỉnh sửa
        </Button>
        <Button
          variant={template.active ? 'ghost' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onToggleActive(template)}
          disabled={isActionPending}
          title={template.active ? 'Lưu trữ mẫu này' : 'Kích hoạt lại mẫu này'}
        >
          <Archive className="size-3.5" />
          {template.active ? 'Lưu trữ' : 'Kích hoạt'}
        </Button>
      </div>
    </article>
  );
}
