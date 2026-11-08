# Tasks 8/10

Owner approved on 2026-11-08. Branch: `codex/tasks-8-10-dashboard-deposit`.

The first dashboard section reports COMPLETED events by local event date. Revenue
is finalized invoice value; net cash and outstanding are separate. Hall usage and
revenue rankings may have different leaders. The menu/service table groups stable
source IDs and frozen commercial values. PAID/DEBT filtering and event pagination
are server-owned. Unknown amounts show an em dash; unfinished invoicing is provisional.

Manager catalog settings configure integer deposit percentage 10–100, default 30.
The new-booking quote is provisional; the server freezes policy when creating the
booking. Contracts display their own stored percentage, including historical 30%.
No client-side percentage calculation is authoritative for payment.

The new report has strict local Zod DTOs, matching the backend schema byte-for-byte.
Released OpenAPI pins are retained until an actual coordinated backend release.
See `../wedding-be/docs/tasks-8-10-api-handoff.md` and backend verification evidence.
No production release or live financial operation is implied by local tests.
