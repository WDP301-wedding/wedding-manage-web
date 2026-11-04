# Completed events and settlement display

The owner authorized this Manager client change on 4 November 2026 together with
wedding-web and PRM-app. The existing Manager completion command marks an event
as organized; billing continues to show its financial position independently.

The booking page explicitly identifies completed events, links to payment and
settlement history, and no longer offers a repeat completion command. The lifecycle
step describes completion of the organization of the event rather than inferring
that its invoice is paid.

The settlement panel uses the current final invoice and current ledger evidence.
It shows “Đã tất toán” only when invoice and accepted charges match, net receipts
match charges, debt and credit are zero, and the billing page is current. Missing,
conflicting or active-payment evidence never certifies settlement. Debt and excess
receipts retain their own labels. No monetary command or invoice history changes.

See the [cross-client behavior and verification scope](../../wedding-web/docs/completed-settlement-2026-11-04.md)
and [live demo completion evidence](../../wedding-be/tasks/evidence/demo-completion-2026-11-04.md).
Local implementation is not a hosted deployment.

Local typecheck, lint and production build pass. All 13 focused settlement and
completion tests pass, plus all four Vietnamese typography checks. Two typography
checks initially hit the five-second timeout during concurrent builds; the isolated
unchanged check passes. Desktop 1440px and mobile 390px browser inspection confirms
the settlement notice, correct Vietnamese sans-serif rendering, no page overflow
and zero console errors with isolated read-only API snapshots.

The broader existing suite is not green: it reports 61 failing tests in 20 files.
A separate checkout of unchanged parent b3b3efa also reproduces failures; its full
run reports 49 failures and four worker errors. Keep this baseline failure evidence
separate from the passing targeted tests and do not claim a release-quality full
suite. No tests, coverage thresholds or application guards were disabled.

The four baseline suites interrupted by worker errors were then run separately
with one worker: all four also failed (11 failing / 5 passing tests). Every test
file failing in the changed checkout therefore also fails on the unchanged parent;
timing and worker failures make the aggregate counts unsuitable for exact equality.
