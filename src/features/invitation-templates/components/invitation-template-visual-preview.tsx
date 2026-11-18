'use client';

import { useState } from 'react';
import { cn } from 'cn';
import { MOTIF_PATHS } from './invitation-motifs';
import type {
  CardFinishId,
  CardFrameId,
  CardLayoutId,
  CardMotifId,
  CardThemeId,
} from '../types/invitation-templates-types';

export interface VisualPreviewProps {
  title: string;
  theme: CardThemeId;
  layout: CardLayoutId;
  finish: CardFinishId;
  frame: CardFrameId;
  coverMotif: CardMotifId;
  insideMotif: CardMotifId;
  greeting?: string | null;
  message?: string | null;
  footer?: string | null;
  includesSeating?: boolean;
  compact?: boolean;
}

const THEME_STYLES: Record<
  CardThemeId,
  {
    coverBg: string;
    coverBorder: string;
    coverText: string;
    coverAccent: string;
    insideBg: string;
    insideBorder: string;
    insideText: string;
    insideHeading: string;
  }
> = {
  'royal-burgundy': {
    coverBg: 'bg-[#4A1224] text-[#C9A46A]',
    coverBorder: 'border-[#C9A46A]',
    coverText: 'text-[#FFFDF9]',
    coverAccent: '#C9A46A',
    insideBg: 'bg-[#FFFDF9] text-[#2B1F24]',
    insideBorder: 'border-[#C9A46A]/50',
    insideText: 'text-[#4A1224]/80',
    insideHeading: 'text-[#7A1F3D]',
  },
  'sage-minimalist': {
    coverBg: 'bg-[#3b5043] text-[#A38368]',
    coverBorder: 'border-[#7c9485]',
    coverText: 'text-[#F7F7F4]',
    coverAccent: '#A38368',
    insideBg: 'bg-[#F7F7F4] text-[#26332b]',
    insideBorder: 'border-[#7c9485]/40',
    insideText: 'text-[#607367]',
    insideHeading: 'text-[#3b5043]',
  },
  'traditional-red': {
    coverBg: 'bg-[#8B2025] text-[#D4AF37]',
    coverBorder: 'border-[#D4AF37]',
    coverText: 'text-[#FFF6EB]',
    coverAccent: '#D4AF37',
    insideBg: 'bg-[#FFFBF9] text-[#2B1817]',
    insideBorder: 'border-[#D4AF37]/50',
    insideText: 'text-[#785A59]',
    insideHeading: 'text-[#9C1C18]',
  },
  'blush-floral': {
    coverBg: 'bg-[#633B42] text-[#E0AAB2]',
    coverBorder: 'border-[#D89AA5]',
    coverText: 'text-[#FFF8F8]',
    coverAccent: '#E0AAB2',
    insideBg: 'bg-[#FFF8F8] text-[#362226]',
    insideBorder: 'border-[#D89AA5]/45',
    insideText: 'text-[#80686D]',
    insideHeading: 'text-[#8C3848]',
  },
  'celestial-navy': {
    coverBg: 'bg-[#141C2B] text-[#D4AF37]',
    coverBorder: 'border-[#7D6C42]',
    coverText: 'text-[#F8FAFF]',
    coverAccent: '#D4AF37',
    insideBg: 'bg-[#F8FAFF] text-[#1B2836]',
    insideBorder: 'border-[#829AB3]/40',
    insideText: 'text-[#627D98]',
    insideHeading: 'text-[#102A43]',
  },
  'champagne-luxury': {
    coverBg: 'bg-[#3E2F1D] text-[#C9A46A]',
    coverBorder: 'border-[#C9A46A]',
    coverText: 'text-[#FFFCF5]',
    coverAccent: '#C9A46A',
    insideBg: 'bg-[#FFFCF5] text-[#33241D]',
    insideBorder: 'border-[#D1B48C]/50',
    insideText: 'text-[#7D6B63]',
    insideHeading: 'text-[#5C4033]',
  },
};

export function InvitationTemplateVisualPreview({
  title,
  theme,
  layout,
  finish,
  frame,
  coverMotif,
  insideMotif,
  greeting,
  message,
  footer,
  includesSeating = false,
  compact = false,
}: VisualPreviewProps) {
  const [face, setFace] = useState<'cover' | 'inside'>('cover');
  const style = THEME_STYLES[theme] ?? THEME_STYLES['royal-burgundy'];

  const frameClass =
    frame === 'arch'
      ? 'rounded-t-[80px] border-2'
      : frame === 'double-line'
        ? 'border-4 border-double'
        : frame === 'scalloped'
          ? 'border-2 border-dashed'
          : frame === 'corners'
            ? 'border-2 ring-2 ring-offset-2'
            : 'border-2'; // inset

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Face Switcher */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
        <button
          type="button"
          onClick={() => setFace('cover')}
          className={cn(
            'px-3 py-1 font-medium rounded-md transition-colors',
            face === 'cover'
              ? 'bg-card text-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Mặt ngoài (Bìa thiệp)
        </button>
        <button
          type="button"
          onClick={() => setFace('inside')}
          className={cn(
            'px-3 py-1 font-medium rounded-md transition-colors',
            face === 'inside'
              ? 'bg-card text-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Mặt trong (Lời mời)
        </button>
      </div>

      {/* Realistic Card Container */}
      <div
        className={cn(
          'relative flex flex-col justify-between overflow-hidden rounded-xl shadow-lg transition-all duration-300',
          compact ? 'w-full max-w-[280px] h-[380px] p-4 text-xs' : 'w-full max-w-[340px] h-[460px] p-6 text-sm',
          face === 'cover' ? `${style.coverBg} border ${style.coverBorder}` : `${style.insideBg} border ${style.insideBorder}`,
        )}
      >
        {/* Layout Flap Visuals */}
        {layout === 'gatefold' && face === 'cover' ? (
          <>
            <span
              className="absolute left-0 top-0 bottom-0 w-8 border-r border-current/25 bg-current/5 pointer-events-none"
              title="Cánh gập trái"
            />
            <span
              className="absolute right-0 top-0 bottom-0 w-8 border-l border-current/25 bg-current/5 pointer-events-none"
              title="Cánh gập phải"
            />
          </>
        ) : null}

        {layout === 'envelope' && face === 'cover' ? (
          <div
            className="absolute top-0 inset-x-0 h-10 border-b border-current/25 bg-current/5 [clip-path:polygon(0_0,100%_0,50%_100%)] pointer-events-none"
            title="Nắp phong bì"
          />
        ) : null}

        {layout === 'album' && (
          <div
            className="absolute left-1 top-0 bottom-0 w-2 flex flex-col justify-around py-4 opacity-50"
            title="Gáy album mini"
          >
            <span className="size-1.5 rounded-full bg-current" />
            <span className="size-1.5 rounded-full bg-current" />
            <span className="size-1.5 rounded-full bg-current" />
          </div>
        )}

        {/* Inner Border Frame */}
        <div
          className={cn(
            'flex flex-col items-center justify-between text-center h-full w-full p-4 relative z-10 transition-all',
            frameClass,
            face === 'cover' ? style.coverBorder : style.insideBorder,
          )}
        >
          {face === 'cover' ? (
            /* COVER FACE */
            <>
              {/* Header eyebrow */}
              <div className="flex flex-col items-center gap-1 pt-2">
                <span className="text-2xs uppercase tracking-widest opacity-80">
                  {finish === 'gold-foil'
                    ? '✨ ÉP KIM CAO CẤP ✨'
                    : finish === 'embossed-cotton'
                      ? '🌿 DẬP NỔI TRÊN GIẤY COTTON'
                      : 'THƯ MỜI THÀNH HÔN'}
                </span>
                <span className="text-2xs tracking-wider opacity-70">Trân trọng kính mời</span>
              </div>

              {/* Central Ornament Motif */}
              <div className="my-auto flex flex-col items-center gap-2">
                <div
                  className="size-16 rounded-full flex items-center justify-center p-2.5 shadow-sm border border-current/30"
                  style={{ color: style.coverAccent }}
                >
                  <svg viewBox="0 0 100 100" className="size-full fill-current">
                    <path d={MOTIF_PATHS[coverMotif] ?? MOTIF_PATHS.phoenix} />
                  </svg>
                </div>

                <h3
                  className={cn(
                    'font-serif font-bold tracking-wide mt-2',
                    compact ? 'text-sm' : 'text-base',
                    style.coverText,
                  )}
                >
                  {title || 'Tên Mẫu Thiệp Cưới'}
                </h3>

                <p className="text-2xs italic opacity-75">
                  Chú rể &amp; Cô dâu
                </p>
              </div>

              {/* Bottom Date & Layout Hint */}
              <div className="flex flex-col items-center gap-0.5 pb-1">
                <span className="text-2xs font-mono opacity-80">26 · 11 · 2026</span>
                <span className="text-3xs uppercase tracking-wider opacity-60">
                  {layout === 'gatefold' ? 'Cánh bướm đôi' : layout === 'album' ? 'Sổ kỷ niệm' : 'Dáng phong bì'}
                </span>
              </div>
            </>
          ) : (
            /* INSIDE FACE */
            <>
              {/* Inside Motif Ornament Top */}
              <div className="flex items-center gap-2 pt-1 opacity-70" style={{ color: style.coverAccent }}>
                <svg viewBox="0 0 100 100" className="size-6 fill-current">
                  <path d={MOTIF_PATHS[insideMotif] ?? MOTIF_PATHS['song-hy']} />
                </svg>
              </div>

              <div className="my-auto flex flex-col items-center gap-2 max-w-full px-2">
                <p className={cn('text-xs font-semibold', style.insideHeading)}>
                  {greeting || 'Trân trọng kính mời quý khách'}
                </p>

                <div className="my-1 border-y border-current/20 py-1.5 w-full">
                  <p className="font-serif font-bold text-sm tracking-wide">
                    Đức Minh <span className="font-sans font-normal opacity-70">&amp;</span> Ngọc Ánh
                  </p>
                  <p className="text-3xs text-muted-foreground mt-0.5">Nhà trai &amp; Nhà gái</p>
                </div>

                <p className={cn('text-2xs italic line-clamp-3 leading-relaxed', style.insideText)}>
                  {message || 'Sự hiện diện của quý khách là niềm vinh hạnh lớn lao cho gia đình chúng tôi.'}
                </p>

                {includesSeating ? (
                  <div className="mt-1 flex items-center gap-1.5 rounded bg-muted/60 px-2 py-0.5 text-3xs text-foreground/80 border border-current/15">
                    <span>🪑 Sơ đồ bàn: Bàn 01 - Bàn 16</span>
                  </div>
                ) : null}
              </div>

              {/* Footer text */}
              <div className="pb-1 border-t border-current/15 pt-1.5 w-full">
                <p className="text-3xs italic opacity-75">
                  {footer || 'Rất hân hạnh được đón tiếp quý khách!'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
