'use client';

import type { CatalogGateway, VenueCatalogGateway } from './catalog-api';
import { cx } from './catalog-classes';

export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

export const catalogTabs = [
  { id: 'venue', label: 'Nhà hàng & sảnh' },
  { id: 'food', label: 'Món & thực đơn' },
  { id: 'timeline', label: 'Kịch bản tiệc' },
  { id: 'layout', label: 'Bố cục bàn' },
] as const;
export type CatalogTab = (typeof catalogTabs)[number]['id'];

export function CatalogTabs({
  active,
  onChange,
}: {
  active: CatalogTab;
  onChange: (tab: CatalogTab) => void;
}) {
  return (
    <div className={cx.tabs} role="tablist" aria-label="Danh mục vận hành">
      {catalogTabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`catalog-tab-${tab.id}`}
          type="button"
          role="tab"
          className={cx.tab}
          aria-selected={active === tab.id}
          aria-controls={`catalog-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === 'ArrowRight') next = (index + 1) % catalogTabs.length;
            else if (event.key === 'ArrowLeft')
              next = (index + catalogTabs.length - 1) % catalogTabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = catalogTabs.length - 1;
            else return;
            event.preventDefault();
            const selected = catalogTabs[next];
            if (selected === undefined) return;
            onChange(selected.id);
            document.getElementById(`catalog-tab-${selected.id}`)?.focus();
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function supportsFood(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadFood' in gateway;
}

export function supportsTimeline(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadTimelines' in gateway;
}

export function supportsLayout(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadLayouts' in gateway;
}

export function supportsMedia(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadMediaResources' in gateway;
}
