# Management test suite repair

The full suite on main `79aa83b` reproduced **41 failures across 14 files**:
303 tests in 52 files, with 262 passing. The earlier 26-case booking repair was
already passing. This follow-up covers every remaining management test file.

## Runtime corrections

- Account password OTP guidance was computed correctly but passed as a fallback
  to the generic API notification normalizer. Generic 422/429 text replaced the
  invalid-code instructions and server wait duration. Authored contextual messages
  now reach the toast directly, retaining the request ID and the existing cooldown,
  password preservation, session-expiration and revoked-session behavior.
- Both dashboard search hooks scheduled an initial empty-query debounce that
  reset a quickly selected page 2 to page 1 after 250ms. The hooks now skip the
  debounce when the trimmed query has not changed. Two regression tests failed
  before the guards and passed afterward.

## Test corrections and safeguards

Dashboard tests use server pagination, filters, sorting and authoritative booking
ownership. Billing fixtures use valid booking IDs and the current recording
eligibility response. Form tests follow the current manual/refund contract and
visible Base UI controls. Staff tests select an assigned event, load its workspace
and explicitly enable name-based check-in before searching guests. Error tests
assert localized messages while retaining machine codes, detail paths and request
correlation data.

Money assertions retain exact payloads, contract/timeline revision IDs and document
digests, explicit confirmation, cancellation before recording, concurrent-command
blocking, uncertain-request keys, original refund revisions, legacy recovery and
denial privacy. Additional cases prevent a replacement charge while an attempt is
active and withhold a sentinel ledger row from a different revision. Retained
approval commands also replay with their original body and idempotency key.
Staff undo tests fail closed on empty, already-undone or changed ledger heads;
disabled check-in remains “Chưa ghi nhận”. No tests are skipped or disabled.

## Completed verification

- Full management suite: **53 files, 318 tests passed**, including typography.
- Audit policy tests: **5 passed**.
- Typecheck, lint and production build passed. Formatting and diff checks passed.
- Chromium at 1280px and 390px exercised the real account component and both
  dashboard hooks through a temporary local route with synthetic HTTP responses.
  Invalid OTP and rate-limit instructions retained their request ID, the retry
  button respected `Retry-After`, and page 2 remained selected after the debounce.
  Screenshots were visually inspected; no page errors or horizontal overflow.
  The temporary route was removed. This is local browser evidence, not a real
  password-change or authenticated production journey.

One whole-suite run overlapped a local production build and ended without a
complete report after a UI timeout. The completed rerun above ran separately and
passed all 318 tests. A local build also correctly rejected development HTTP
origins; production build verification uses the current Render HTTPS origins
without editing local environment files.

CI now runs the **entire** management suite before deployment, replacing the
previous focused booking/typography command.
