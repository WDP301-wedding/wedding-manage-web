import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type DateParts, parseDateParts, toIsoString, toVnString } from './date-picker-utils';

/** Trạng thái và thao tác của DatePicker: giá trị (có/không điều khiển), tháng đang xem, gõ tay, đóng khi bấm ra ngoài. */
export function useDatePicker({
  value,
  defaultValue,
  min,
  max,
  disabled,
  onChange,
  containerRef,
}: Readonly<{
  containerRef: RefObject<HTMLDivElement | null>;
  value?: string | undefined;
  defaultValue?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  disabled?: boolean | undefined;
  onChange?: ((iso: string) => void) | undefined;
}>) {
  const isControlled = value !== undefined;

  const [uncontrolledIso, setUncontrolledIso] = useState<string>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    return parts ? toIsoString(parts) : '';
  });
  const [uncontrolledDisplay, setUncontrolledDisplay] = useState<string>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    return parts ? toVnString(parts) : '';
  });
  const [isOpen, setIsOpen] = useState(false);

  const controlledParts = isControlled ? parseDateParts(value) : null;
  const selectedIso = isControlled
    ? controlledParts
      ? toIsoString(controlledParts)
      : ''
    : uncontrolledIso;
  const displayValue = isControlled
    ? controlledParts
      ? toVnString(controlledParts)
      : (value ?? '')
    : uncontrolledDisplay;

  // View year and month for calendar navigation
  const [viewYear, setViewYear] = useState<number>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    if (parts) return parts.year;
    const minParts = parseDateParts(min);
    if (minParts) return minParts.year;
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parts = parseDateParts(value ?? defaultValue ?? '');
    if (parts) return parts.month - 1; // 0-indexed
    const minParts = parseDateParts(min);
    if (minParts) return minParts.month - 1;
    return new Date().getMonth();
  });

  const [prevControlledValue, setPrevControlledValue] = useState(value);
  if (isControlled && value !== prevControlledValue) {
    setPrevControlledValue(value);
    if (controlledParts) {
      setViewYear(controlledParts.year);
      setViewMonth(controlledParts.month - 1);
    }
  }

  // Handle outside click to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const parts: DateParts = { year: viewYear, month: viewMonth + 1, day };
    const iso = toIsoString(parts);
    if (!isControlled) {
      setUncontrolledIso(iso);
      setUncontrolledDisplay(toVnString(parts));
    }
    onChange?.(iso);
    setIsOpen(false);
  };

  const handleClear = () => {
    if (!isControlled) {
      setUncontrolledIso('');
      setUncontrolledDisplay('');
    }
    onChange?.('');
    setIsOpen(false);
  };

  // User typing support
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    inputVal = inputVal.replace(/[^\d/-]/g, '');

    // Auto add slashes for pure digits input: 25102026 -> 25/10/2026
    if (!inputVal.includes('/') && !inputVal.includes('-') && inputVal.length > 2) {
      if (inputVal.length <= 4) {
        inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2)}`;
      } else {
        inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2, 4)}/${inputVal.slice(4, 8)}`;
      }
    }

    if (!isControlled) {
      setUncontrolledDisplay(inputVal);
    }

    const parts = parseDateParts(inputVal);
    if (parts) {
      const iso = toIsoString(parts);
      if (!isControlled) {
        setUncontrolledIso(iso);
      }
      setViewYear(parts.year);
      setViewMonth(parts.month - 1);
      onChange?.(iso);
    } else if (inputVal === '') {
      if (!isControlled) {
        setUncontrolledIso('');
      }
      onChange?.('');
    }
  };

  const handleBlur = () => {
    if (!displayValue.trim()) {
      if (!isControlled) {
        setUncontrolledIso('');
        setUncontrolledDisplay('');
      }
      onChange?.('');
      return;
    }
    const parts = parseDateParts(displayValue);
    if (parts) {
      const iso = toIsoString(parts);
      if (!isControlled) {
        setUncontrolledIso(iso);
        setUncontrolledDisplay(toVnString(parts));
      }
      onChange?.(iso);
    } else if (selectedIso) {
      const prevParts = parseDateParts(selectedIso);
      if (!isControlled) {
        setUncontrolledDisplay(prevParts ? toVnString(prevParts) : '');
      }
    } else {
      if (!isControlled) {
        setUncontrolledDisplay('');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  // Calendar math
  const { emptyCells, dayCells } = useMemo(() => {
    // 0 = Monday, 6 = Sunday
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    const today = new Date();
    const todayIso = toIsoString({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    });

    const minIso = min ? (parseDateParts(min) ? toIsoString(parseDateParts(min)!) : min) : null;
    const maxIso = max ? (parseDateParts(max) ? toIsoString(parseDateParts(max)!) : max) : null;

    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const currentIso = toIsoString({ year: viewYear, month: viewMonth + 1, day });
      const isDisabled =
        (minIso !== null && currentIso < minIso) || (maxIso !== null && currentIso > maxIso);
      const isSelected = selectedIso === currentIso;
      const isToday = todayIso === currentIso;

      days.push({
        day,
        iso: currentIso,
        isDisabled,
        isSelected,
        isToday,
      });
    }

    return {
      emptyCells: Array.from({ length: firstDayIndex }),
      dayCells: days,
    };
  }, [viewYear, viewMonth, selectedIso, min, max]);

  return {
    isOpen,
    setIsOpen,
    selectedIso,
    displayValue,
    viewYear,
    viewMonth,
    emptyCells,
    dayCells,
    handleToggle,
    handlePrevMonth,
    handleNextMonth,
    handleDaySelect,
    handleClear,
    handleInputChange,
    handleBlur,
    handleKeyDown,
  };
}
