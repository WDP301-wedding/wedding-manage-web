# Vercel deployment

Production project: `bach-le-ba-s-projects/wedding-manage-web`.

Production URL: <https://wedding-manage-web.vercel.app>.

Set the Vercel **production** environment variable
`NEXT_PUBLIC_API_BASE_URL=https://wedding-manage-web.vercel.app/api/v1` before
building. Public variables are embedded at build time; changing them requires a
new deployment. Keep local `.env.local` for local development only.

`vercel.json` proxies `/api/v1/*` to the Railway backend. Browser requests and
the backend's Secure, HttpOnly, SameSite=Lax host refresh cookie therefore use
the web origin. Keep this exact origin in Railway `CORS_ALLOWED_ORIGINS`; the
customer web origin should remain its first entry for email credential links.
Never add Supabase service credentials, Brevo credentials, or backend secrets
to this web.

The project uses Node 24.x, `npm ci`, and `npm run build`. Deploy the reviewed
source using the authenticated Vercel CLI:

```powershell
vercel link --yes --scope bach-le-ba-s-projects --project wedding-manage-web
vercel deploy --dry --json
vercel deploy --prod --yes --scope bach-le-ba-s-projects
```

Inspect the dry-run file list before uploading: `.env*`, private keys,
credentials, Git metadata, and local build output must be excluded by
`.vercelignore`. The CLI can add an OIDC token to local `.env.local`; never
commit or upload that file.

## Automatic production deployment

The private organization repository uses GitHub Actions with the current Vercel
Hobby plan. `.github/workflows/ci.yml` deploys pushes to `main` only after the
quality job passes all formatting, lint, type, contract, coverage, build and audit
gates. Pull requests run the same checks without production deployment.

The deploy job uses pinned Vercel CLI 63.1.0 to pull production configuration,
build the artifact and deploy it with `--prebuilt --prod`. The Vercel team and
project IDs are public workflow configuration. Store the deployment token only
in this repository's `VERCEL_TOKEN` Actions secret. The token is scoped to
this Vercel project and expires on 9 October 2027; rotate each project's token
and replace its repository secret before that date.

To redeploy the current `main`, open Actions → Management Web CI → Run workflow
and select `main`. Quality checks run again before deployment. Do not change the
workflow to bypass failed checks. Inspect the deployment job's URL and verify the
public routes below after each release.

After deployment, verify `/`, `/bookings`, `/consultation-requests`, `/account`,
and `/api/v1/catalog/halls`. An unauthenticated refresh request must return 401,
not a CORS denial. Inspect production at desktop and mobile widths.

For later releases, record the previous successful deployment URL before
publishing. Use `vercel rollback <previous-deployment-url>` or promote the
previous deployment in the dashboard to restore it. This first deployment has
no earlier release to restore.

References: [Vercel external rewrites](https://vercel.com/docs/routing/rewrites),
[CLI deployment](https://vercel.com/docs/cli/deploy).
