'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Calendar, MapPin, ArrowRight } from 'lucide-react';
import {
  navigationService,
  type NavigationBooking,
} from '@/src/services/bookings/booking-navigation.service';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { Badge } from '@/src/components/ui/badge';

export function SpotlightSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NavigationBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Search bookings on query change
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      void navigationService
        .bookings({ scope: 'all', q: query.trim(), page: 1, pageSize: 8 })
        .then((res) => {
          setResults(res.items);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelectBooking = (booking: NavigationBooking) => {
    setOpen(false);
    router.push(`/bookings?bookingId=${booking.bookingId}`);
  };

  return (
    <>
      {/* Top Header Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-[260px] items-center justify-between rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground transition-colors hover:border-hy-outline-strong hover:bg-muted focus-visible:border-primary focus-visible:outline-none"
        aria-label="Tìm kiếm hồ sơ tiệc"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5 text-muted-foreground" />
          <span>Tìm tiệc, khách, sảnh…</span>
        </span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground shadow-2xs">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {open ? (
        <div
          className="fixed inset-0 z-[1300] flex items-start justify-center p-4 pt-20 sm:pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm nhanh hồ sơ tiệc"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-hy-ink/50 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <div className="relative z-10 flex w-full max-w-[580px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-hy-2 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95">
            {/* Search Input Field */}
            <div className="flex items-center border-b border-border px-4 py-3">
              <Search className="mr-3 size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập mã tiệc, tên cô dâu chú rể, số điện thoại, sảnh…"
                className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                  ESC để đóng
                </span>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Đang tìm kiếm hồ sơ trong cơ sở dữ liệu…
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    KẾT QUẢ TÌM THẤY ({results.length})
                  </span>
                  {results.map((booking) => {
                    const couple =
                      [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
                      booking.customerName ||
                      booking.alias ||
                      'Chưa có tên khách';
                    return (
                      <button
                        key={booking.bookingId}
                        type="button"
                        onClick={() => handleSelectBooking(booking)}
                        className="flex items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              #{booking.bookingCode || 'Chưa cấp mã'}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{couple}</span>
                            <Badge variant={booking.phase === 'CONFIRMED' ? 'success' : 'neutral'}>
                              {booking.phase === 'CONFIRMED'
                                ? 'Đã xác nhận'
                                : booking.phase === 'AWAITING_DEPOSIT'
                                ? 'Chờ cọc'
                                : booking.phase === 'COMPLETED'
                                ? 'Hoàn thành'
                                : 'Bản nháp'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 text-primary" />
                              {booking.hallNameSnapshot || 'Sảnh'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-primary" />
                              {formatDate(booking.eventDate)} ({booking.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'})
                            </span>
                            <span>•</span>
                            <span>{booking.tableCount} bàn</span>
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-60" />
                      </button>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Không tìm thấy hồ sơ tiệc nào phù hợp với từ khóa &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Gõ từ khóa để tìm kiếm tiệc cưới theo mã hồ sơ, tên cô dâu chú rể hoặc sảnh tiệc.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
