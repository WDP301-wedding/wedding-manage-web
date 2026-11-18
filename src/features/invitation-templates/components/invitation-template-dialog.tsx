'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
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
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-hy-ink/50 p-4"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-hy-2 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="template-dialog-title" className="text-lg font-bold">
              {initialTemplate ? 'Chỉnh sửa mẫu thiệp' : 'Thêm mẫu thiệp mới'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {initialTemplate
                ? `Phiên bản hiện tại: Rev.${initialTemplate.revisionNumber}`
                : 'Tạo mẫu thiệp cưới chuẩn để cặp đôi chọn làm thiết kế.'}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto px-6 py-4 gap-5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {selectedTheme ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-2xs text-muted-foreground">Màu chính:</span>
                  {selectedTheme.palette.map((c, i) => (
                    <span
                      key={i}
                      className="size-3 rounded-full border border-border"
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
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
          <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Văn bản mẫu mặc định
            </h4>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-greeting" className="text-xs font-medium">
                Lời mời đầu thiệp
              </Label>
              <Input
                id="tpl-greeting"
                value={form.greeting}
                onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                placeholder="VD: Trân trọng kính mời quý khách..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-message" className="text-xs font-medium">
                Lời nhắn chúc phúc
              </Label>
              <Textarea
                id="tpl-message"
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="VD: Sự hiện diện của quý khách là niềm vinh hạnh lớn lao..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-footer" className="text-xs font-medium">
                Lời cảm ơn chân thiệp
              </Label>
              <Input
                id="tpl-footer"
                value={form.footer}
                onChange={(e) => setForm({ ...form, footer: e.target.value })}
                placeholder="VD: Rất hân hạnh được đón tiếp quý khách!"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.includesSeating}
                onChange={(e) => setForm({ ...form, includesSeating: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              Tự động kèm sơ đồ chỗ ngồi vào mẫu in
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              Kích hoạt cho phép khách hàng chọn
            </label>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.title.trim()}>
              {isSubmitting ? 'Đang lưu…' : initialTemplate ? 'Lưu thay đổi' : 'Tạo mẫu thiệp'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
