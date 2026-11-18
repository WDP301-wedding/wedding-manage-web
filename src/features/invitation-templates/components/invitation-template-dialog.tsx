'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { InvitationTemplateVisualPreview } from './invitation-template-visual-preview';
import {
  FINISH_OPTIONS,
  FRAME_OPTIONS,
  LAYOUT_OPTIONS,
  MOTIF_OPTIONS,
  THEME_OPTIONS,
  type InvitationTemplateItem,
  type TemplateDraftForm,
} from '../types/invitation-templates-types';

interface InvitationTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: TemplateDraftForm, existingTemplate?: InvitationTemplateItem) => Promise<void>;
  initialTemplate?: InvitationTemplateItem | null;
  isSubmitting?: boolean;
}

const defaultDraft: TemplateDraftForm = {
  title: '',
  theme: 'royal-burgundy',
  layout: 'gatefold',
  finish: 'gold-foil',
  frame: 'inset',
  coverMotif: 'phoenix',
  insideMotif: 'song-hy',
  greeting: 'Trân trọng kính mời quý khách tới chung vui trong ngày hạnh phúc',
  message:
    'Sự hiện diện của quý khách là niềm vinh hạnh lớn lao và lời chúc phúc ý nghĩa nhất cho ngày vui trọn vẹn của hai gia đình.',
  footer: 'Rất hân hạnh được đón tiếp quý khách!',
  includesSeating: true,
  active: true,
};

export function InvitationTemplateDialog({
  isOpen,
  onClose,
  onSubmit,
  initialTemplate,
  isSubmitting = false,
}: InvitationTemplateDialogProps) {
  const [form, setForm] = useState<TemplateDraftForm>(defaultDraft);

  useEffect(() => {
    if (initialTemplate) {
      const pres = initialTemplate.presentation;
      const dec = pres?.decoration;
      setForm({
        title: initialTemplate.title,
        theme: pres?.theme ?? 'royal-burgundy',
        layout: pres?.layout ?? 'gatefold',
        finish: dec?.finish ?? 'gold-foil',
        frame: dec?.frame ?? 'inset',
        coverMotif: dec?.coverMotif ?? 'phoenix',
        insideMotif: dec?.insideMotif ?? 'song-hy',
        greeting: initialTemplate.textFields.greeting ?? '',
        message: initialTemplate.textFields.message ?? '',
        footer: initialTemplate.textFields.footer ?? '',
        includesSeating: initialTemplate.includesSeating,
        active: initialTemplate.active ?? true,
      });
    } else {
      setForm(defaultDraft);
    }
  }, [initialTemplate, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onSubmit(form, initialTemplate ?? undefined);
  };

  const selectedTheme = THEME_OPTIONS.find((t) => t.id === form.theme);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-hy-ink/50 p-3 sm:p-5"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-card shadow-hy-2 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 bg-muted/20">
          <div>
            <h2 id="template-dialog-title" className="text-lg font-bold">
              {initialTemplate ? 'Chỉnh sửa mẫu thiệp' : 'Thêm mẫu thiệp mới'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {initialTemplate
                ? `Phiên bản: Rev.${initialTemplate.revisionNumber}`
                : 'Tạo mẫu thiệp cưới chuẩn kèm giao diện trực quan cho quản lý & khách hàng.'}
            </p>
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 2-Column Body: Left is Form, Right is Live Visual Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1">
          {/* Cột trái: Form cấu hình */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col p-6 gap-4 border-b lg:border-b-0 lg:border-r border-border">
            {/* Tên mẫu thiệp */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-title" className="text-xs font-semibold">
                Tên mẫu thiệp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-title"
                required
                maxLength={120}
                placeholder="VD: Thư Báo Hỷ · Dạ Tiệc Hoàng Gia"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Theme & Layout Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-theme" className="text-xs font-semibold">
                  Chủ đề & Bảng màu
                </Label>
                <select
                  id="tpl-theme"
                  value={form.theme}
                  onChange={(e) =>
                    setForm({ ...form, theme: e.target.value as TemplateDraftForm['theme'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {selectedTheme ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-3xs text-muted-foreground">Màu:</span>
                    {selectedTheme.palette.map((c, i) => (
                      <span
                        key={i}
                        className="size-2.5 rounded-full border border-border"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-layout" className="text-xs font-semibold">
                  Kiểu dáng gập thiệp
                </Label>
                <select
                  id="tpl-layout"
                  value={form.layout}
                  onChange={(e) =>
                    setForm({ ...form, layout: e.target.value as TemplateDraftForm['layout'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {LAYOUT_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Finishes & Frames */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-finish" className="text-xs font-semibold">
                  Kỹ thuật in ấn / Chất liệu
                </Label>
                <select
                  id="tpl-finish"
                  value={form.finish}
                  onChange={(e) =>
                    setForm({ ...form, finish: e.target.value as TemplateDraftForm['finish'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {FINISH_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-frame" className="text-xs font-semibold">
                  Khung viền trang trí
                </Label>
                <select
                  id="tpl-frame"
                  value={form.frame}
                  onChange={(e) =>
                    setForm({ ...form, frame: e.target.value as TemplateDraftForm['frame'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {FRAME_OPTIONS.map((fr) => (
                    <option key={fr.id} value={fr.id}>
                      {fr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Motifs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-cover-motif" className="text-xs font-semibold">
                  Họa tiết bìa trước
                </Label>
                <select
                  id="tpl-cover-motif"
                  value={form.coverMotif}
                  onChange={(e) =>
                    setForm({ ...form, coverMotif: e.target.value as TemplateDraftForm['coverMotif'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {MOTIF_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-inside-motif" className="text-xs font-semibold">
                  Họa tiết trang trong
                </Label>
                <select
                  id="tpl-inside-motif"
                  value={form.insideMotif}
                  onChange={(e) =>
                    setForm({ ...form, insideMotif: e.target.value as TemplateDraftForm['insideMotif'] })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {MOTIF_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sample text fields */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
              <h4 className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                Văn bản mẫu mặc định
              </h4>
              <div className="flex flex-col gap-1">
                <Label htmlFor="tpl-greeting" className="text-3xs font-medium">
                  Lời mời đầu thiệp
                </Label>
                <Input
                  id="tpl-greeting"
                  value={form.greeting}
                  onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                  placeholder="VD: Trân trọng kính mời quý khách..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="tpl-message" className="text-3xs font-medium">
                  Lời nhắn chúc phúc
                </Label>
                <Textarea
                  id="tpl-message"
                  rows={2}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="VD: Sự hiện diện của quý khách là niềm vinh hạnh..."
                  className="text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="tpl-footer" className="text-3xs font-medium">
                  Lời cảm ơn chân thiệp
                </Label>
                <Input
                  id="tpl-footer"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                  placeholder="VD: Rất hân hạnh được đón tiếp quý khách!"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.includesSeating}
                  onChange={(e) => setForm({ ...form, includesSeating: e.target.checked })}
                  className="size-3.5 rounded border-border text-primary focus:ring-primary"
                />
                Tự động kèm sơ đồ chỗ ngồi
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="size-3.5 rounded border-border text-primary focus:ring-primary"
                />
                Cho phép khách hàng chọn
              </label>
            </div>

            {/* Form Action Buttons */}
            <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || !form.title.trim()}>
                {isSubmitting ? 'Đang lưu…' : initialTemplate ? 'Lưu thay đổi' : 'Tạo mẫu thiệp'}
              </Button>
            </div>
          </form>

          {/* Cột phải: Live Visual Preview */}
          <aside className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-muted/30 border-t lg:border-t-0">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Eye className="size-3.5 text-primary" />
              <span>Giao diện mẫu thiệp trực quan (Live)</span>
            </div>
            <InvitationTemplateVisualPreview
              title={form.title}
              theme={form.theme}
              layout={form.layout}
              finish={form.finish}
              frame={form.frame}
              coverMotif={form.coverMotif}
              insideMotif={form.insideMotif}
              greeting={form.greeting}
              message={form.message}
              footer={form.footer}
              includesSeating={form.includesSeating}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
