'use client';

import { type FormEvent, useState } from 'react';

export interface IncidentalFormData {
  name: string;
  note?: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
}

export function IncidentalCreateForm({
  disabled = false,
  loading = false,
  onSubmit,
  onCancel,
}: Readonly<{
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (data: IncidentalFormData) => Promise<void>;
  onCancel: () => void;
}>) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('thùng');
  const [unitPriceVnd, setUnitPriceVnd] = useState(0);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || quantity <= 0 || unitPriceVnd < 0) return;

    await onSubmit({
      name: name.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
      quantity,
      unit: unit.trim(),
      unitPriceVnd,
    });
  };

  const totalCalculated = quantity * unitPriceVnd;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="incidental-form"
      style={{
        background: 'var(--hy-surface-warm)',
        padding: '1.25rem',
        borderRadius: 'var(--hy-radius-md)',
        border: '1px solid var(--hy-outline)',
        marginTop: '0.75rem',
      }}
    >
      <h4
        style={{
          margin: '0 0 1rem',
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--hy-ink)',
        }}
      >
        Ghi nhận chi phí phát sinh mới
      </h4>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
        }}
      >
        <div>
          <label
            htmlFor="inc-name"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--hy-ink)',
            }}
          >
            Tên hạng mục *
          </label>
          <input
            id="inc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="VD: Nước ngọt phát sinh"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--hy-radius-sm)',
              border: '1px solid var(--hy-outline-strong)',
              background: 'var(--hy-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="inc-qty"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--hy-ink)',
            }}
          >
            Số lượng *
          </label>
          <input
            id="inc-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--hy-radius-sm)',
              border: '1px solid var(--hy-outline-strong)',
              background: 'var(--hy-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="inc-unit"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--hy-ink)',
            }}
          >
            Đơn vị tính *
          </label>
          <input
            id="inc-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--hy-radius-sm)',
              border: '1px solid var(--hy-outline-strong)',
              background: 'var(--hy-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="inc-price"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--hy-ink)',
            }}
          >
            Đơn giá (VND) *
          </label>
          <input
            id="inc-price"
            type="number"
            min={0}
            step={1}
            value={unitPriceVnd || ''}
            onChange={(e) => setUnitPriceVnd(Number(e.target.value))}
            required
            placeholder="VD: 300000"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--hy-radius-sm)',
              border: '1px solid var(--hy-outline-strong)',
              background: 'var(--hy-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: '0.85rem' }}>
        <label
          htmlFor="inc-note"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: 4,
            color: 'var(--hy-ink)',
          }}
        >
          Ghi chú / Biên bản bàn giao
        </label>
        <input
          id="inc-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Theo yêu cầu của gia đình cô dâu / chú rể"
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--hy-radius-sm)',
            border: '1px solid var(--hy-outline-strong)',
            background: 'var(--hy-surface)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderTop: '1px solid var(--hy-outline)',
          paddingTop: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: 'var(--hy-ink-muted)' }}>
          Thành tiền ước tính:{' '}
          <strong style={{ color: 'var(--hy-wine)', fontSize: '1rem' }}>
            {totalCalculated.toLocaleString('vi-VN')} đ
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            disabled={disabled || loading}
            className="hy-btn hy-btn-primary"
            style={{ minHeight: '38px', padding: '0 16px' }}
          >
            {loading ? 'Đang lưu…' : 'Lưu phát sinh'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="hy-btn hy-btn-secondary"
            style={{ minHeight: '38px', padding: '0 16px' }}
          >
            Huỷ
          </button>
        </div>
      </div>
    </form>
  );
}
