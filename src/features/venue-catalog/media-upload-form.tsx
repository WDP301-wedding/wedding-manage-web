'use client';

import { type FormEvent, useState } from 'react';
import type { CatalogMedia } from './catalog-api';

function value(data: FormData, name: string): string {
  const item = data.get(name);
  return typeof item === 'string' ? item.trim() : '';
}

export interface MediaUploadFormProps {
  assets: readonly CatalogMedia[];
  onSubmit: (
    input: Readonly<{ file: File; alternativeText: string; oldAssetId?: string }>,
  ) => Promise<boolean>;
  pending: boolean;
}

export function MediaUploadForm({ assets, onSubmit, pending }: Readonly<MediaUploadFormProps>) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = selectedFile;
    const alternativeText = value(data, 'alternativeText');
    const oldAssetId = value(data, 'oldAssetId');
    if (file === null || file.size === 0) {
      setLocalError('Hãy chọn một ảnh để tải lên.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLocalError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError('Ảnh phải nhỏ hơn hoặc bằng 10 MB.');
      return;
    }
    void onSubmit({
      file,
      alternativeText,
      ...(oldAssetId === '' ? {} : { oldAssetId }),
    }).then((success) => {
      if (success) {
        form.reset();
        setSelectedFile(null);
      }
    });
  };

  return (
    <form
      className="catalog-editor media-upload-form"
      aria-label="Tải ảnh danh mục"
      onSubmit={submit}
    >
      <div className="catalog-editor-heading">
        <span className="section-kicker">JPEG · PNG · WebP, tối đa 10 MB</span>
        <h3>Tải lên hoặc thay thế ảnh</h3>
      </div>
      {localError === null ? null : (
        <p className="catalog-error" role="alert">
          {localError}
        </p>
      )}
      <label className="catalog-field">
        <span>Ảnh JPEG, PNG hoặc WebP</span>
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <label className="catalog-field">
        <span>Văn bản thay thế</span>
        <input name="alternativeText" maxLength={250} required />
      </label>
      <label className="catalog-field">
        <span>Chế độ tải lên</span>
        <select name="oldAssetId" defaultValue="">
          <option value="">Thêm ảnh mới</option>
          {assets.map((asset, index) => (
            <option key={asset.id} value={asset.id}>
              Thay ảnh {index + 1} · {asset.alternativeText}
            </option>
          ))}
        </select>
      </label>
      <button className="catalog-primary-button" type="submit" disabled={pending}>
        Tải ảnh lên
      </button>
    </form>
  );
}
