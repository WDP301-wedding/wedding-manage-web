# Wedding Management Web

Next.js application for Manager and Staff administration experiences. It consumes the backend contract and never owns database access, privileged credentials, or authoritative business rules.

For the complete four-repository setup and contract workflow, see the backend-owned [cross-repository development guide](https://github.com/WDP301-wedding/wedding-be/blob/main/docs/cross-repo-development.md).

## Quick start

Requires Node.js 24.21.0 (see `.node-version`) and npm 11.x.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --port 3002
```

Open `http://localhost:3002`. The default environment points to the backend at `http://localhost:3001`.

`NEXT_PUBLIC_API_BASE_URL` is public browser configuration. Use only a local loopback HTTP URL in development and HTTPS elsewhere. Never place a database URL, service-role key, provider key, bearer token, or other credential in a `NEXT_PUBLIC_` variable.

## API contract

The generated type declaration at `src/lib/api/generated/schema.d.ts` comes from the backend OpenAPI artifact pinned by exact commit and SHA-256 digest in `api-contract.lock.json`. Keep `wedding-manage-web` and `wedding-be` as sibling directories for the default local source.

```powershell
npm run api:check
npm run api:generate
```

Run `api:check` for normal verification. Run `api:generate` only after the backend contract has been committed and the lock file has been updated to that immutable artifact. Never hand-edit the generated schema.

## Commands

| Command                              | Purpose                                         |
| ------------------------------------ | ----------------------------------------------- |
| `npm run dev`                        | Start the Next.js development server            |
| `npm run build`                      | Create a production build                       |
| `npm run start`                      | Serve the production build                      |
| `npm run lint`                       | Run ESLint with zero warnings allowed           |
| `npm run typecheck`                  | Generate Next.js types and run TypeScript       |
| `npm run test` / `npm run test:unit` | Run Vitest tests                                |
| `npm run test:coverage`              | Run the coverage gate                           |
| `npm run api:generate`               | Regenerate the typed API schema                 |
| `npm run api:check`                  | Verify the locked artifact and committed schema |
| `npm run format:check`               | Check Prettier formatting                       |

## Troubleshooting

- If browser requests fail, confirm the backend is on port 3001 and includes `http://localhost:3002` in `CORS_ALLOWED_ORIGINS`.
- A digest mismatch means the local OpenAPI file is not the artifact recorded in `api-contract.lock.json`; do not bypass it. Update the lock only after the backend contract commit exists.
- Production builds reject a cleartext non-loopback API URL. Use HTTPS outside local development.
