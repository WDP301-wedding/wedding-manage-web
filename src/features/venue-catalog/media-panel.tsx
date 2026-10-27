'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import Image from 'next/image';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogGateway,
  CatalogMedia,
  CatalogMediaResource,
  CatalogMediaResourceType,
} from './catalog-api';
import { MediaUploadForm } from './media-upload-form';
import { notify } from '../../design-system/notifications';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

export function MediaPanel({
  authorize,
  gateway,
  active = true,
  allowedTypes,
  sectionKicker = 'Thư viện dùng chung',
  heading = 'Ảnh, lịch sử và vòng đời',
  description = 'Ảnh chỉ hiển thị qua URL ký số ngắn hạn. Khóa lưu trữ nội bộ không bao giờ được đưa ra giao diện.',
}: Readonly<{
  authorize: Authorize;
  gateway: CatalogGateway;
  active?: boolean;
  allowedTypes?: readonly CatalogMediaResourceType[];
  sectionKicker?: string;
  heading?: string;
  description?: string;
}>) {
  const headingId = useId();
  const [resources, setResources] = useState<readonly CatalogMediaResource[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [assets, setAssets] = useState<readonly CatalogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetsLoadedAtRef = useRef<number>(0);
  const initialLoadStarted = useRef(false);
  const inFlightRenewRef = useRef<boolean>(false);
  const allowedTypesKey = allowedTypes ? allowedTypes.join(',') : '';

  const selected = useMemo(
    () => resources.find((resource) => mediaResourceKey(resource) === selectedKey) ?? resources[0],
    [resources, selectedKey],
  );

  const loadAssets = useCallback(
    async (resource: CatalogMediaResource, background = false) => {
      const next = await authorize((token) =>
        gateway.loadMedia(token, { path: resource.path, id: resource.id }),
      );
      assetsLoadedAtRef.current = Date.now();
      if (background && hasDirtyCatalogForms()) return;
      setAssets([...next].sort((left, right) => left.displayOrder - right.displayOrder));
    },
    [authorize, gateway],
  );

  const load = useCallback(
    async (preferredKey?: string, background = false) => {
      setLoading(true);
      setError(null);
      try {
        const allResources = await authorize((token) => gateway.loadMediaResources(token));
        const nextResources = allowedTypes
          ? allResources.filter((resource) => allowedTypes.includes(resource.type))
          : allResources;
        if (background && hasDirtyCatalogForms()) return;
        setResources(nextResources);
        const next =
          nextResources.find((resource) => mediaResourceKey(resource) === preferredKey) ??
          nextResources.find((resource) => resource.type === 'HALL') ??
          nextResources.find((resource) => resource.type === 'MENU_PACKAGE_VERSION') ??
          nextResources.find((resource) => resource.type === 'DISH_VERSION') ??
          nextResources[0];
        if (next === undefined) {
          setSelectedKey('');
          setAssets([]);
        } else {
          setSelectedKey(mediaResourceKey(next));
          await loadAssets(next, background);
        }
      } catch (caught) {
        setError(mediaErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    },
    [allowedTypesKey, authorize, gateway, loadAssets],
  );

  useEffect(() => {
    if (!active || initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    queueMicrotask(() => void load());
  }, [active, load]);

  const refreshSelected = useCallback(
    (background = false) => load(selectedKey, background),
    [load, selectedKey],
  );
  useCatalogLiveRefresh(refreshSelected, active);

  useEffect(() => {
    if (!active || selected === undefined || assets.length === 0) return;
    const minimumTtl = Math.min(
      ...assets.map(({ signedUrlExpiresInSeconds }) => signedUrlExpiresInSeconds),
    );
    const elapsedSeconds =
      assetsLoadedAtRef.current > 0
        ? Math.max(0, Math.floor((Date.now() - assetsLoadedAtRef.current) / 1000))
        : 0;
    const remainingSeconds = minimumTtl - elapsedSeconds;

    // Renew 30s before expiry with minimum 15s delay to prevent tight hotloops
    const delaySeconds = Math.max(15, remainingSeconds - 30);

    const triggerRenew = () => {
      if (inFlightRenewRef.current) return;
      inFlightRenewRef.current = true;
      void loadAssets(selected)
        .catch((caught: unknown) => setError(mediaErrorMessage(caught)))
        .finally(() => {
          inFlightRenewRef.current = false;
        });
    };

    if (typeof document !== 'undefined' && document.hidden) {
      const onVisible = () => {
        if (!document.hidden) {
          document.removeEventListener('visibilitychange', onVisible);
          triggerRenew();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }

    const timeout = setTimeout(triggerRenew, delaySeconds * 1000);
    return () => clearTimeout(timeout);
  }, [active, assets, loadAssets, selected]);

  const run = async (success: string, operation: (token: string) => Promise<void>) => {
    if (selected === undefined) return false;
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await authorize(operation);
      setMessage(success);
      await loadAssets(selected);
      return true;
    } catch (caught) {
      setError(mediaErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  const chooseResource = (resourceKey: string) => {
    const resource = resources.find((candidate) => mediaResourceKey(candidate) === resourceKey);
    if (resource === undefined) return;
    setSelectedKey(mediaResourceKey(resource));
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
    <section className="catalog-section media-section" aria-labelledby={headingId}>
      <div className="catalog-section-heading">
        <p className="section-kicker">{sectionKicker}</p>
        <h2 id={headingId}>{heading}</h2>
        <p>{description}</p>
      </div>
      <PanelMessages error={error} message={message} />
      <div className="media-toolbar">
        <label className="catalog-field">
          <span>Tài nguyên danh mục</span>
          <select
            value={selected === undefined ? '' : mediaResourceKey(selected)}
            onChange={(event) => chooseResource(event.currentTarget.value)}
            disabled={loading || resources.length === 0}
          >
            {resources.length === 0 ? <option value="">Chưa có tài nguyên</option> : null}
            {resources.map((resource) => (
              <option key={mediaResourceKey(resource)} value={mediaResourceKey(resource)}>
                {resource.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="catalog-secondary-button"
          type="button"
          disabled={selected === undefined || loading}
          onClick={() =>
            selected === undefined
              ? undefined
              : void loadAssets(selected).catch((caught: unknown) =>
                  setError(mediaErrorMessage(caught)),
                )
          }
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
                  <span>
                    {formatBytes(asset.sizeBytes)} · {asset.contentType}
                  </span>
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
            <p className="catalog-help">
              Phiên bản lịch sử là chỉ đọc; thứ tự ảnh được giữ nguyên.
            </p>
          ) : null}
          <MediaUploadForm
            assets={assets}
            pending={pending}
            onSubmit={(input) =>
              run(
                input.oldAssetId === undefined ? 'Đã tải ảnh lên.' : 'Đã thay thế ảnh.',
                (token) =>
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

function PanelMessages({
  error,
  message,
}: Readonly<{ error: string | null; message: string | null }>) {
  useEffect(() => {
    if (error) {
      notify.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      notify.success(message);
    }
  }, [message]);

  return null;
}

function mediaResourceKey(resource: Pick<CatalogMediaResource, 'path' | 'id'>): string {
  return `${resource.path}:${resource.id}`;
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
    if (error.status === 422)
      return (
        error.details?.map(({ message }) => message).join(' ') || 'Ảnh hoặc mô tả chưa hợp lệ.'
      );
    if (error.status === 403 || error.status === 404)
      return 'Máy chủ từ chối tài nguyên media này.';
  }
  return 'Không thể tải thư viện ảnh. Hãy thử lại.';
}
