# Staff invitation release — 2026-11-09

Manager personnel provisioning sends a Staff invitation through the backend.
The email opens `/staff-invitation#<token>` here. The page removes the fragment
before requesting details; only its in-memory token is posted to the public
details/acceptance endpoints. A new invitee sets and confirms a password. An
existing account verifies its current password unchanged. Success links to login
with the email prefilled. Staff event assignment remains a separate Manager action.

Directory states distinguish pending/accepted/expired invitations and provider
acceptance/explicit rejection/uncertain sending. Provider acceptance is not inbox
delivery. Explicit resend rotates the old link; disabling revokes pending links.
The existing OTP reset flow remains available for accounts that already have a
password. New Staff must use the invitation rather than the old reset workaround.

Requires backend PR 117 and `MANAGE_WEB_ORIGIN=https://wedding-manage-web.vercel.app`.
New response fields are optional for compatibility during the coordinated rollout.
The released OpenAPI pin must reference an actual released backend commit.

Local checks before the dependency follow-up: all 347 tests, focused invitation,
personnel and typography tests, types/lint, HTTPS production build and Chromium
desktop/320px mobile initial setup through Staff login. Release CI reruns the full
suite and build on the final dependency versions.

The release audit identified existing advisories. A separate commit pins Next
16.4.5 and Zod 4.6.7 and overrides Vite 8.3.3 / follow-redirects 1.16.3. The audit
then reports zero critical/high findings; no audit policy was weakened. Sources:
[Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr),
[Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Vite advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
[redirect advisory](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p).
