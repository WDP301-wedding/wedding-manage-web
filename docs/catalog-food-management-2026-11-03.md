# Món ăn và gói thực đơn, 2026-11-03

## Follow-up: tables and version history

The owner subsequently authorized tables with one row per dish/menu, explicit
published price/version plus a separate draft badge, and read-only historical
details (including the exact historical dishes of a menu). New-version forms now
remain local until Save. Cancel/Escape/close before Save sends no catalog mutation;
existing drafts have a separate resume action. A lost clone response retains the
same source/destination/idempotency key for retry. All APIs remain unchanged.

The backend additionally copies source images into destination-owned objects when
cloning a dish/menu, preserving original images. See the [backend hand-off and
verification](../../wedding-be/docs/catalog-food-versions-2026-11-03.md).
Dish retirement within a published menu intentionally retains its existing behavior.

Follow-up verification: typecheck, lint, production build and the unchanged API pin
passed. All 32 catalog tests passed; the four Vietnamese typography tests passed
when run separately after load-related timeouts. Local browser verification with
real backend/PostgreSQL covered exact history, published-versus-draft prices,
Cancel with zero writes, Save creating a draft only on confirmation, narrow table
scrolling at 320/768/1024/1440 pixels and Escape/focus restoration. Image inheritance
was verified for both food types through local HTTP and 18 focused PostgreSQL tests.
Full-suite failures remain documented in the backend hand-off; this is not a cloud
deployment or a claim that every project suite passes.

The original delivery and evidence below are preserved for their original scope.

## Original delivery

Branch: `codex/catalog-food-usability-20261103` in manage-web and backend.

The catalog displays one latest draft/current publication per dish or menu.
Create forms open on demand; details show descriptions, prices and ordered dishes
without cloning. Edit opens the existing working draft or creates one from the
current publication. Save-and-publish saves current input first and uses the
server-returned revision. Retired items can be activated; deletion requires
confirmation and uses the backend soft-delete API. Historical commercial data
remains unchanged. Food media selectors also show only the latest version.

The existing design tokens, buttons, badges, dialog and Vietnamese font policy are
preserved. Search, status filtering and cursor pagination support larger catalogs.
Menu choices contain only current published versions of active dishes.

The API pin references backend commit `1f41ada`, SHA-256
`0e5f29fd8160b287fa18e1287b4d8dc68a006dc847bc0c05d7c246ac4571f1b8`.
Regeneration also picked up existing backend contract changes; three local type
adapters were aligned without changing payment/contract/analytics runtime behavior.

Validation: typecheck, lint, production build and API check passed. All 28
catalog/typography tests passed. Browser verification used actual local backend
requests and PostgreSQL for create/edit/publish, dish ordering, details,
retire/restore, confirmed deletion and reload. Search/status filtering, keyboard
Escape/focus restoration and layouts at 320/768/1440 pixels were verified.

Full frontend suite: 245 passed, 7 failures in consultation navigation, billing
access and account OTP tests. The same 7 failures reproduce at baseline `10f63cd`.
They remain outside this catalog change; the full suite is not green.

Local frontend: `http://localhost:3002/catalog`, backend: `http://localhost:3001`.
The ignored `.env.local` points both HTTP and realtime to the local backend.
The dedicated demo database is `127.0.0.1:55435/wedding_local_demo`.
Credentials for the separate local manager are in
`../wedding-be/.local-demo/catalog-login.json` (ignored; never commit).
Cloud deployment and shared-data mutation are outside this delivery.
