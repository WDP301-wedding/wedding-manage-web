'use client';

import Image from 'next/image';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogGateway,
  CatalogMedia,
  CatalogMediaResource,
} from './catalog-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

export function MediaPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [resources, setResources] = useState<readonly CatalogMediaResource[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [assets, setAssets] = useState<readonly CatalogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => resources.find(({ id }) => id === selectedId) ?? resources[0],
    [resources, selectedId],
  );

  const loadAssets = useCallback(
    async (resource: CatalogMediaResource) => {
      const next = await authorize((token) =>
        gateway.loadMedia(token, { path: resource.path, id: resource.id }),
      );
      setAssets([...next].sort((left, right) => left.displayOrder - right.displayOrder));
    },
    [authorize, gateway],
  );

  const load = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const nextResources = await authorize((token) => gateway.loadMediaResources(token));
        setResources(nextResources);
        const next = nextResources.find(({ id }) => id === preferredId) ?? nextResources[0];
        if (next === undefined) {
          setSelectedId('');
          setAssets([]);
        } else {
          setSelectedId(next.id);
          await loadAssets(next);
        }
      } catch (caught) {
        setError(mediaErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    },
    [authorize, gateway, loadAssets],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (selected === undefined || assets.length === 0) return;
    const minimumTtl = Math.min(...assets.map(({ signedUrlExpiresInSeconds }) => signedUrlExpiresInSeconds));
    const timeout = setTimeout(() => void loadAssets(selected), Math.max(1, minimumTtl - 30) * 1000);
    return () => clearTimeout(timeout);
  }, [assets, loadAssets, selected]);

  const run = async (success: string, operation: (token: string) => Promise<void>) => {
    if (selected === undefined) return false;
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await authorize(operation);
      setMessage(success);
      await load(selected.id);
      return true;
    } catch (caught) {
      setError(mediaErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  const chooseResource = (resourceId: string) => {
    const resource = resources.find(({ id }) => id === resourceId);
    if (resource === undefined) return;
    setSelectedId(resource.id);
    setLoading(true);
    setError(null);
    void loadAssets(resource)
      .catch((caught: unknown) => setError(mediaErrorMessage(caught)))
      .finally(() => setLoading(false));
  };

  const reorder = (from: number, to: number) => {
    if (selected === undefined || !selected.mutableOrder) return;
    const next = [...assets];
    const [asset] = next.splice(from, 1);
    if (asset === undefined) return;
    next.splice(to, 0, asset);
    void run('Đã lưu thứ tự ảnh.', (token) =>
      gateway.reorderMedia(token, {
        path: selected.path,
        id: selected.id,
        revision: selected.revision,
        assetIds: next.map(({ id }) => id),
      }),
    );
  };

  return (
    <section className="catalog-section media-section" aria-labelledby="media-heading">
      <div className="catalog-section-heading">
        <p className="section-kicker">Thư viện dùng chung</p>
        <h2 id="media-heading">Ảnh, lịch sử và vòng đời</h2>
        <p>
          Ảnh chỉ hiển thị qua URL ký số ngắn hạn. Khóa lưu trữ nội bộ không bao giờ được đưa ra
          giao diện.
        </p>
      </div>
      <PanelMessages error={error} message={message} />
      <div className="media-toolbar">
        <label className="catalog-field">
          <span>Tài nguyên danh mục</span>
          <select
            value={selected?.id ?? ''}
            onChange={(event) => chooseResource(event.currentTarget.value)}
            disabled={loading || resources.length === 0}
          >
            {resources.length === 0 ? <option value="">Chưa có tài nguyên</option> : null}
            {resources.map((resource) => (
              <option key={`${resource.path}:${resource.id}`} value={resource.id}>
                {resource.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="catalog-secondary-button"
          type="button"
          disabled={selected === undefined || loading}
          onClick={() => selected === undefined ? undefined : void loadAssets(selected).catch((caught: unknown) => setError(mediaErrorMessage(caught)))}
        >
          Làm mới URL ký số
        </button>
      </div>
      {loading && assets.length === 0 ? <p className="catalog-empty">Đang tải ảnh…</p> : null}
      {!loading && selected !== undefined && assets.length === 0 ? (
        <p className="catalog-empty">Tài nguyên này chưa có ảnh.</p>
      ) : null}
      {selected === undefined ? null : (
        <>
          <ol className="media-gallery" aria-label="Thứ tự ảnh danh mục">
            {assets.map((asset, index) => (
              <li key={asset.id}>
                <div className="media-preview">
                  <Image
                    src={asset.signedUrl}
                    alt={asset.alternativeText}
                    width={480}
                    height={320}
                    sizes="(max-width: 620px) 100vw, 320px"
                    unoptimized
                  />
                </div>
                <div className="media-card-copy">
                  <strong>{asset.alternativeText}</strong>
                  <span>{formatBytes(asset.sizeBytes)} · {asset.contentType}</span>
                  <small>URL ký số · {formatTtl(asset.signedUrlExpiresInSeconds)}</small>
                </div>
                <div className="media-order-actions">
                  <button
                    type="button"
                    aria-label={`Đưa ảnh ${index + 1} lên`}
                    disabled={pending || !selected.mutableOrder || index === 0}
                    onClick={() => reorder(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa ảnh ${index + 1} xuống`}
                    disabled={pending || !selected.mutableOrder || index === assets.length - 1}
                    onClick={() => reorder(index, index + 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!selected.mutableOrder && assets.length > 1 ? (
            <p className="catalog-help">Phiên bản lịch sử là chỉ đọc; thứ tự ảnh được giữ nguyên.</p>
          ) : null}
          <MediaUploadForm
            assets={assets}
            pending={pending}
            onSubmit={(input) =>
              run(input.oldAssetId === undefined ? 'Đã tải ảnh lên.' : 'Đã thay thế ảnh.', (token) =>
                gateway.uploadMedia(token, {
                  ...input,
                  assetId: crypto.randomUUID(),
                  resourceType: selected.type,
                  resourceId: selected.id,
                }),
              )
            }
          />
        </>
      )}
    </section>
  );
}

function MediaUploadForm({
  assets,
  onSubmit,
  pending,
}: Readonly<{
  assets: readonly CatalogMedia[];
  onSubmit: (input: Readonly<{ file: File; alternativeText: string; oldAssetId?: string }>) => Promise<boolean>;
  pending: boolean;
}>) {
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
    <form className="catalog-editor media-upload-form" aria-label="Tải ảnh danh mục" onSubmit={submit}>
      <div className="catalog-editor-heading">
        <span className="section-kicker">JPEG · PNG · WebP, tối đa 10 MB</span>
        <h3>Tải lên hoặc thay thế ảnh</h3>
      </div>
      {localError === null ? null : <p className="catalog-error" role="alert">{localError}</p>}
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

function PanelMessages({ error, message }: Readonly<{ error: string | null; message: string | null }>) {
  return (
    <div className="catalog-panel-messages" aria-live="polite">
      {message === null ? null : <p className="catalog-success" role="status">{message}</p>}
      {error === null ? null : <p className="catalog-error" role="alert">{error}</p>}
    </div>
  );
}

function value(data: FormData, name: string): string {
  const item = data.get(name);
  return typeof item === 'string' ? item.trim() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
}

function formatTtl(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)} phút` : `${seconds} giây`;
}

function mediaErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status !== undefined && error.status >= 500) {
      return 'Nhà cung cấp lưu trữ đang gián đoạn. Ảnh chưa được thay đổi; hãy thử lại.';
    }
    if (error.status === 409) return 'Thư viện đã thay đổi ở phiên khác. Hãy tải lại rồi thử lại.';
    if (error.status === 422) return error.details?.map(({ message }) => message).join(' ') || 'Ảnh hoặc mô tả chưa hợp lệ.';
    if (error.status === 403 || error.status === 404) return 'Máy chủ từ chối tài nguyên media này.';
  }
  return 'Không thể tải thư viện ảnh. Hãy thử lại.';
}
