# Generated API declarations

Import public types from `@/src/lib/api/generated/schema`.

`scripts/generate-api.mjs` verifies the pinned OpenAPI digest and generates the
entry file plus declarations in `parts/`. Each generated file is limited to 450
lines. The public `paths`, `webhooks`, `components`, `$defs` and `operations`
exports retain their original structures.

Run `npm run api:generate` to regenerate and `npm run api:check` to verify all
parts. Supply `OPENAPI_SOURCE` when the sibling backend's working copy differs
from the source pinned in `api-contract.lock.json`. Do not edit parts by hand.
