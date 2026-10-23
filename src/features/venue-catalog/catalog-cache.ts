// Scoped and bounded cache for management venue catalog resources
// Implements canonical keys, promise identity guarding, generation fences, and dependency-aware invalidation.

interface CacheEntry<T> {
  readonly data: T;
  readonly cachedAt: number;
  readonly generation: number;
}

interface InFlightEntry<T> {
  readonly promise: Promise<T>;
  readonly generation: number;
}

const DEFAULT_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 200;

let currentGeneration = 1;
const sharedCatalogCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, InFlightEntry<unknown>>();

// Dependency graph for catalog resource mutations
const CATALOG_DEPENDENCIES: Record<string, readonly string[]> = {
  '/management/catalog/halls': [
    '/management/catalog/halls',
    '/management/catalog/layout-templates',
    '/management/catalog/media',
  ],
  '/management/catalog/dishes': ['/management/catalog/dishes', '/management/catalog/menu-packages'],
  '/management/catalog/menu-packages': ['/management/catalog/menu-packages'],
  '/management/catalog/timeline-templates': ['/management/catalog/timeline-templates'],
  '/management/catalog/layout-templates': ['/management/catalog/layout-templates'],
  '/management/catalog/shifts': ['/management/catalog/shifts'],
  '/management/catalog/restaurant': ['/management/catalog/restaurant'],
};

export function canonicalCacheKey(endpoint: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  const sortedKeys = Object.keys(params).sort();
  const sortedParams: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    if (params[k] !== undefined) {
      sortedParams[k] = params[k];
    }
  }
  return `${endpoint}?${JSON.stringify(sortedParams)}`;
}

function isErrorResponse(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const obj = result as Record<string, unknown>;
  if ('error' in obj && obj.error !== undefined && obj.error !== null) return true;
  if (typeof obj.status === 'number' && obj.status >= 400) return true;
  return false;
}

type CatalogInvalidationListener = () => void;
const invalidationListeners = new Set<CatalogInvalidationListener>();

export function addCatalogInvalidationListener(listener: CatalogInvalidationListener): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

export function clearCatalogCache(): void {
  currentGeneration++;
  sharedCatalogCache.clear();
  inFlightRequests.clear();
  for (const listener of Array.from(invalidationListeners)) {
    try {
      listener();
    } catch {
      // Listener error should not break cache clearing
    }
  }
}

export function invalidateCatalogResource(_accessTokenIgnored: string, endpoint: string): void {
  const dependencies = CATALOG_DEPENDENCIES[endpoint] ?? [endpoint];
  for (const target of dependencies) {
    for (const key of Array.from(sharedCatalogCache.keys())) {
      if (key === target || key.startsWith(`${target}?`)) {
        sharedCatalogCache.delete(key);
      }
    }
    for (const key of Array.from(inFlightRequests.keys())) {
      if (key === target || key.startsWith(`${target}?`)) {
        inFlightRequests.delete(key);
      }
    }
  }
}

export async function fetchSharedCatalogResource<T>(
  _accessTokenIgnored: string,
  endpoint: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cacheKey = canonicalCacheKey(endpoint, params);
  const now = Date.now();

  const existing = sharedCatalogCache.get(cacheKey);
  if (existing !== undefined) {
    if (now - existing.cachedAt <= ttlMs && existing.generation === currentGeneration) {
      return existing.data as T;
    }
    sharedCatalogCache.delete(cacheKey);
  }

  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight !== undefined && existingInFlight.generation === currentGeneration) {
    return existingInFlight.promise as Promise<T>;
  }

  const requestGen = currentGeneration;
  const holder: { promise?: Promise<T> } = {};
  const opPromise: Promise<T> = (async () => {
    try {
      const result = await fetcher();
      if (!isErrorResponse(result) && requestGen === currentGeneration) {
        if (sharedCatalogCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = sharedCatalogCache.keys().next().value;
          if (oldestKey) sharedCatalogCache.delete(oldestKey);
        }
        sharedCatalogCache.set(cacheKey, {
          data: result,
          cachedAt: Date.now(),
          generation: requestGen,
        });
      }
      return result;
    } finally {
      const active = inFlightRequests.get(cacheKey);
      if (active?.promise === holder.promise) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  holder.promise = opPromise;
  inFlightRequests.set(cacheKey, { promise: opPromise, generation: requestGen });
  return opPromise;
}

if (typeof window !== 'undefined') {
  import('../realtime/realtime-client').then(({ sharedManagementRealtime }) => {
    sharedManagementRealtime.addEventListener((event) => {
      if (event.type === 'catalog.updated') {
        clearCatalogCache();
      }
    });
  }).catch(() => {
    // Ignore in non-browser/test environments
  });
}
