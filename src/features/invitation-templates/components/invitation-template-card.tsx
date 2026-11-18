'use client';

import { Archive, CheckCircle2, Edit2, Layout, Palette, Sparkles, XCircle } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { MOTIF_PATHS } from './invitation-motifs';
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

  const frameClass =
    frameConfig?.id === 'arch'
      ? 'rounded-t-2xl border-2'
      : frameConfig?.id === 'double-line'
        ? 'border-2 border-double'
        : frameConfig?.id === 'scalloped'
          ? 'border-2 border-dashed'
          : frameConfig?.id === 'corners'
            ? 'border-2 ring-1'
            : 'border';

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
          {themeConfig ? (
            <span className="text-3xs font-semibold uppercase tracking-wider text-primary">
              {finishConfig?.label.split('(')[0]?.trim() ?? 'Tiêu chuẩn'}
            </span>
          ) : null}
        </div>

        {/* Mini Card Visual Banner (Giống bên giao diện người dùng wedding-web) */}
        <div
          aria-hidden="true"
          className={cn(
            'relative isolate flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border text-xs shadow-2xs transition-transform group-hover:scale-[1.01]',
            themeConfig ? '' : 'bg-muted/40 border-border/80 text-muted-foreground',
          )}
          style={
            themeConfig
              ? {
                  backgroundColor: themeConfig.palette[2],
                  borderColor: themeConfig.palette[1],
                  color: themeConfig.palette[3] ?? themeConfig.palette[0],
                }
              : undefined
          }
        >
          {coverMotifConfig && (
            <div
              className={cn(
                'absolute inset-2 flex items-center justify-between px-3 pointer-events-none opacity-40',
                frameClass,
              )}
              style={{ borderColor: themeConfig?.palette[1] ?? 'currentColor' }}
            >
              <svg viewBox="0 0 100 100" className="size-8 fill-current">
                <path d={MOTIF_PATHS[coverMotifConfig.id]} />
              </svg>
              <svg viewBox="0 0 100 100" className="size-8 fill-current rotate-180">
                <path d={MOTIF_PATHS[coverMotifConfig.id]} />
              </svg>
            </div>
          )}
          <span className="relative z-10 rounded-md bg-card/95 px-3 py-1 text-xs font-semibold shadow-xs border border-border/60 text-foreground">
            Thiệp cưới
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
          {template.title}
        </h3>

        {/* Palette Dots Row */}
        {themeConfig ? (
          <div className="flex items-center gap-1.5">
            {themeConfig.palette.map((color, idx) => (
              <span
                key={idx}
                className="size-3.5 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <span className="ml-auto text-xs font-medium text-foreground/80">
              {themeConfig.label}
            </span>
          </div>
        ) : null}

        {/* Presentation Metadata */}
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <Palette className="size-3.5 shrink-0 text-primary" />
            <span className="font-medium">{themeConfig?.label ?? 'Chưa cấu hình chủ đề'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layout className="size-3.5 shrink-0" />
            <span>Kiểu: {layoutConfig?.label.split('(')[0]?.trim() ?? 'Cánh bướm đôi (Mặc định)'}</span>
          </div>
          {finishConfig || coverMotifConfig ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" />
              <span>
                {coverMotifConfig?.label ?? 'Họa tiết cơ bản'}
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
