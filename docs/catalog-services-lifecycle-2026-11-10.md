# Restaurant services and incidental catalog lifecycle

Owner requested this Manager Web change on 2026-11-10: expose stop/restore actions
for incidental items and add Restaurant services next to Incidental expenses,
with compact layouts that stay inside their container.

## Behavior

- Both catalogs have an Active (default), Stopped and All filter. Each record has
  Edit and Stop/Restore actions. A short inline confirmation describes the scope
  of the change before a write. State no longer appears as an edit-form checkbox.
- New items are active. Editing a stopped item preserves its stopped state.
  Switching tabs preserves unsaved fields. A successful state change to the item
  currently being edited preserves the form and advances its known revision.
- Incidental catalog changes affect bookings created afterward. Existing bookings
  keep their frozen prices. Service catalog changes affect new selections;
  approved contracts and appendices retain their snapshots.
- Desktop rows align in columns; narrow screens stack labeled details and wrap
  actions. Long names, descriptions, rules and units can wrap. The tab strip alone
  scrolls horizontally, and brings the selected tab into view.

## Existing API integration

No backend schema, migration, financial record or payment behavior changes.

| Catalog             | List/create                                 | Update/stop/restore                           |
| ------------------- | ------------------------------------------- | --------------------------------------------- |
| Incidentals         | `GET/POST /management/incidental-offerings` | `PATCH /management/incidental-offerings/{id}` |
| Restaurant services | `GET/POST /management/services`             | `PATCH /management/services/{id}`             |

Writes run through the Manager authorization callback and include an
`Idempotency-Key`. PATCH sends the displayed record's `expectedRevision` and
complete supported facts, with `active` explicitly set. Failed identical intents
reuse their key; errors do not optimistically change status or clear form input.
Reloading a list does not silently rebase an unsaved draft onto another version.
After a conflict, cancel and reopen the item to edit the newer version.

Both lists consume all pages and reject repeated pagination cursors. In-flight
live reads are invalidated when a write starts. Staff presentation continues to
be blocked by the existing catalog workspace access gate.

## Local verification

- Full Manager Web suite passed: 63 files / 356 tests (`npm test -- --maxWorkers=2`).
- Typecheck, lint and changed-file formatting passed. The production build passed
  with process-only HTTPS example API/realtime URLs. The first build correctly
  rejected local HTTP development URLs; environment files were unchanged.
- Focused component tests cover filters, confirmation/cancel, archive/restore,
  exact API bodies, integer VND, retained inactive state, retries, stale edits,
  pagination failures, keyboard tab navigation and unsaved fields across tabs.
- Vietnamese typography policy passed independently: 4 tests.
- Browser QA used a temporary local preview with the real workspace, navigation,
  components and styles plus an in-memory Axios adapter. Create/edit/stop/restore
  flows passed. Console errors: zero. The preview route was removed afterward.
- Both panels were inspected at 320, 768, 1024 and 1440 CSS pixels. No panel,
  record, fieldset, input or action overflow was found; screenshots are under
  `output/playwright/catalog-{services,incidentals}-{width}.png`.
- Mobile direct navigation to `?tab=services` kept the selected tab visible.

This is local UI/integration-shape evidence, not an authenticated deployed E2E
test or a claim that a production catalog has been changed. Deployment is separate.
