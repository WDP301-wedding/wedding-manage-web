'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type SelectHTMLAttributes,
} from 'react';
import { Select } from '@base-ui/react/select';

type Option = { value: string; label: string; disabled: boolean; group: string };
/** The native select remains the form/validation/event authority; Base UI owns its visible picker. */
export const HySelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function HySelect({ children, className, style, onInvalid, autoFocus, ...props }, forwardedRef) {
    const labelPrefix = useId();
    const [labelledBy, setLabelledBy] = useState('');
    const native = useRef<HTMLSelectElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const [options, setOptions] = useState<Option[]>([]);
    const [value, setValue] = useState(String(props.value ?? props.defaultValue ?? ''));
    const [open, setOpen] = useState(false);
    const [invalid, setInvalid] = useState(false);
    useImperativeHandle(forwardedRef, () => native.current!, []);
    useLayoutEffect(() => {
      const element = native.current;
      if (!element) return;
      const sync = () => {
        const labels = [
          ...new Set([
            ...Array.from(trigger.current?.labels ?? []),
            ...Array.from(element.labels ?? []),
          ]),
        ];
        const ids = Array.from(labels ?? [])
          .map((label, index) => {
            if (!label.id) label.id = `${labelPrefix}-label-${index}`;
            return label.id;
          })
          .join(' ');
        setLabelledBy(ids);
        const items = Array.from(element.options)
          .filter((o) => !o.hidden)
          .map((o) => ({
            value: o.value,
            label: o.label,
            disabled:
              o.disabled ||
              (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled),
            group: o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : '',
          }));
        setOptions((previous) =>
          JSON.stringify(previous) === JSON.stringify(items) ? previous : items,
        );
        setValue(element.value);
        if (element.validity.valid) setInvalid(false);
      };
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(element, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'label', 'value', 'selected'],
      });
      const reset = () => queueMicrotask(sync);
      element.form?.addEventListener('reset', reset);
      return () => {
        observer.disconnect();
        element.form?.removeEventListener('reset', reset);
      };
    }, [children, props.value, props.defaultValue, labelPrefix]);
    useEffect(() => {
      if (props.disabled) setOpen(false);
    }, [props.disabled]);
    if (props.multiple || (props.size !== undefined && props.size > 1))
      return (
        <select
          {...props}
          ref={native}
          className={className}
          style={style}
          autoFocus={autoFocus}
          onInvalid={onInvalid}
        >
          {children}
        </select>
      );
    const label =
      options.find((o) => o.value === value)?.label ?? (props.required ? 'Chọn một mục…' : 'Chọn…');
    return (
      <>
        <select
          {...props}
          ref={native}
          tabIndex={-1}
          aria-hidden="true"
          id={props.id}
          className="hy-select-native"
          onFocus={(event) => {
            props.onFocus?.(event);
            trigger.current?.focus();
          }}
          onClick={(event) => {
            event.preventDefault();
            trigger.current?.focus();
            setOpen(true);
          }}
          onInvalid={(event) => {
            onInvalid?.(event);
            event.preventDefault();
            setInvalid(true);
            trigger.current?.focus();
            setOpen(true);
          }}
        >
          {children}
        </select>
        <Select.Root
          value={value}
          open={open}
          onOpenChange={setOpen}
          disabled={props.disabled}
          items={options.map((o) => ({ value: o.value, label: o.label }))}
          onValueChange={(next: string | null) => {
            const element = native.current;
            if (next === null || !element) return;
            element.value = next;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            setValue(element.value);
            setInvalid(!element.validity.valid);
            setOpen(false);
          }}
        >
          <Select.Trigger
            ref={trigger}
            id={props.id ? `${props.id}-trigger` : undefined}
            autoFocus={autoFocus}
            className={`hy-select-trigger ${className ?? ''}`}
            style={style}
            aria-label={props['aria-label']}
            aria-labelledby={
              props['aria-labelledby'] ??
              (props['aria-label'] ? undefined : labelledBy || undefined)
            }
            aria-describedby={props['aria-describedby']}
            aria-invalid={props['aria-invalid'] ?? invalid}
            aria-required={props.required}
            title={props.title}
          >
            <span className="hy-select-label">{label}</span>
            <span className="hy-select-chevron" aria-hidden />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6} align="start" className="hy-select-positioner">
              <Select.Popup className="hy-select-popup">
                <Select.List>
                  {options.map((option, index) => (
                    <Select.Item
                      key={`${option.value}:${index}`}
                      value={option.value}
                      disabled={option.disabled}
                      className="hy-select-option"
                      onClick={() => setOpen(false)}
                    >
                      <Select.ItemText>
                        {option.group ? `${option.group} · ` : ''}
                        {option.label}
                      </Select.ItemText>
                      <Select.ItemIndicator className="hy-select-mark" aria-hidden>
                        ✓
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                  {options.length === 0 && <p className="hy-select-empty">Chưa có lựa chọn</p>}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </>
    );
  },
);
