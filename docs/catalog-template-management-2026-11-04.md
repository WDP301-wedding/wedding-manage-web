# Timeline/layout catalog presentation, 2026-11-04

Timeline and layout templates now use one table row per aggregate. Rows prefer
the current published version and separately identify an existing draft. Details
show descriptions, draft content and selectable superseded versions. Timeline
details show ordered programme items; layout details show the hall, guest range,
capacity, exact historical geometry and a read-only canvas.

New-version and resume-draft dialogs retain the existing timeline ordering,
presets, layout canvas and numeric/batch controls. Opening or cancelling an editor
does not mutate the API. Local table additions/removals are also deferred until
Save. Save-and-publish persists edits before publishing the confirmed revision.
The original editor version is retained across background catalog refreshes.

The existing API is sufficient; there are no backend or schema changes. Clone,
table-registration and retirement retries retain their command keys in HTTP
headers only. The save sequence registers surviving new table identities, updates
draft geometry, retires removed existing identities and optionally publishes.
These are separate server commands: once Save starts, Cancel is not a rollback of
successful commands. Revision conflicts remain visible and do not silently adopt
another session's revision.

The timeline image-library panel is removed. Shared photo-library bodies now use
16 px mobile / 24 px desktop padding and a responsive picker/refresh toolbar.
Stored media and backend media capabilities are unchanged.

Validation:

- TypeScript, ESLint, production build and whitespace/NFC checks passed.
- All 73 catalog, typography and print-order dialog regression tests passed.
- Isolated browser fixtures verified desktop (1440 px) and mobile (390 px), exact
  historical details, no horizontal page/modal overflow, Cancel restoring local
  fields/table geometry and keyboard focus restoration. Photo-library toolbar
  insets measured approximately 24 px on desktop. Browser API writes were blocked.
- The initial full-suite run had 44 failures; baseline `489aa26` also had 44.
  Both included load-sensitive failures (intake/typography), which passed when
  rerun separately. Existing catalog select/toast test selectors were updated for
  the current HySelect UI; the focused suites above are green. Other project
  failures remain outside this change; the full suite is not green.

The checks above describe implementation verification. Production release status
is tracked by the pull request and its main-branch Actions deployment run.
