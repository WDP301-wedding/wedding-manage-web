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
commit or upload that file. Git auto-deployment is not configured by this setup.

After deployment, verify `/`, `/bookings`, `/consultation-requests`, `/account`,
and `/api/v1/catalog/halls`. An unauthenticated refresh request must return 401,
not a CORS denial. Inspect production at desktop and mobile widths.

For later releases, record the previous successful deployment URL before
publishing. Use `vercel rollback <previous-deployment-url>` or promote the
previous deployment in the dashboard to restore it. This first deployment has
no earlier release to restore.

References: [Vercel external rewrites](https://vercel.com/docs/routing/rewrites),
[CLI deployment](https://vercel.com/docs/cli/deploy).
