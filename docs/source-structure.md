# Source structure

`app/` owns Next.js routes, metadata, root providers and the global CSS entry.
Keep route folders and framework entry filenames there. Application behavior lives
in `src/`; a page in `app/` imports the corresponding feature page.

```text
src/
  components/
    ui/                  Shared controls and statistic cards
      styles/            Styles scoped to shared UI components
    layout/              Operations shell
    navigation/          Global search
    data-display/        Shared table controls
  design-system/
    branding/
    date-picker/
    feedback/
    motion/
    notifications/
  features/
    booking-lifecycle/
    booking-archive/
    dashboard/
    finance/
    identity-access/
    payments-billing/
    print-orders/
    realtime/
    staff-operations/
    venue-catalog/
  services/              HTTP services grouped by business domain
    analytics/
    bookings/
    billing/
    catalog/
    staff/
  lib/
    api/                 Transport, error handling and generated API types
    domain/              Shared booking/date/capacity/deposit rules
    formatting/
    validation/
  styles/
    tokens.css           Shared colors, corners, typography and motion tokens
    theme.css            Tailwind mappings, source scanning and base styles
    components/          Global styles for shared controls and portals
    features/            Global operations cockpit styles
```

## Feature folders

Use only the folders a feature needs:

- `pages/`: feature entry components used by Next.js routes.
- `workspace/`: composition of a multi-step workspace and its tabs.
- `components/`: presentation, grouped by business subflow when the feature is large.
- `hooks/`: feature state, queries and synchronization hooks.
- `api/`: feature-specific gateways, adapters and caches.
- `types/`: feature contracts and shared types.
- `state/` or `mutations/`: existing command intent and mutation orchestration.
- `utils/`: helpers that are specific to this feature.
- `styles/`: CSS modules and shared class definitions for the feature.
- `data/`: existing static/fixture data consumed by that feature.

Booking components are separated into `activation`, `appendices`, `consultations`,
`contracts`, `create`, `proposals` and `timeline`. Dashboard code is outside
identity/access; revenue reporting belongs to `finance/revenue`.

Use `./file` for siblings in the same folder and `@/src/...` for other internal
imports. Keep client directives, exports, authorization and financial command
ownership with their existing modules. Do not introduce forwarding files at old
paths or duplicate components to support a move.

## Styles and configuration

`app/globals.css` preserves the original global stylesheet order. Feature CSS
modules are imported by their components; portal/select styles remain global.
`theme.css` scans both `src/` and `app/`. `components.json` points shadcn to that
same stylesheet.

Change shared tokens or reusable UI components for system-wide changes. Keep
feature-specific styles in the feature's `styles/` folder. Root tool configuration,
scripts, generated API output and public assets retain their framework/tool paths.

## File size limit

Every application code/style file must stay at or below 450 lines, including
generated TypeScript declarations. `npm run check:files` scans `app/`, `src/`,
`scripts/` and root tool configuration. `npm run lint` runs this check first.
Dependencies, build output and lockfile data are outside the application-source
limit.

Split large views into stable presentation components and state hooks. Keep
financial intent/recovery, revision checks, authorization and API payloads intact.
Feature styles may use ordered imports, preserving their original cascade.

The API generator writes the public `src/lib/api/generated/schema.d.ts` entry and
smaller declarations in `generated/parts/`. Consumers keep importing the public
entry. Do not hand-edit these files: use `npm run api:generate` and
`npm run api:check` with the OpenAPI source matching `api-contract.lock.json`.
