# Booking regression repair

The 26 failures reported during the standard-contract work reproduced on the
pre-contract baseline. They covered six booking lifecycle test files.

| File                                | Failures | Cause and correction                                                                                                                                                                                                                 |
| ----------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `booking-page.test.tsx`             |       11 | Native-select queries matched both the hidden form control and the visible Base UI picker. Tests now operate the visible combobox and popup options. Consultation success copy and the live-message assertion follow the current UI. |
| `booking-resume.test.tsx`           |        1 | Prefilled selections now use the visible combobox text; the other prefill and concurrent-booking assertions remain.                                                                                                                  |
| `timeline-template-picker.test.tsx` |        3 | Template options mount when the picker opens. Tests open and select the visible option, retaining copy, ordering and invalid-offset checks.                                                                                          |
| `timeline-editor.test.tsx`          |        1 | Template selection used the old native control. The loaded picker remains available after an invalid template.                                                                                                                       |
| `booking-page-timeline.test.tsx`    |        7 | Completion and settlement action labels changed, and authorization errors now have specific Vietnamese messages. Existing command, navigation and error-recovery assertions remain.                                                  |
| `intake-page.test.tsx`              |        3 | Conflict and empty-response errors now use normalized Vietnamese messages. Retry and duplicate-acceptance checks remain.                                                                                                             |

The visible hall/menu triggers also exposed a real lazy-loading bug. Their focus
and click events did not reach handlers attached to the hidden native select.
Handlers now live on the enclosing field label, which receives events from the
visible trigger. The existing booking tests exercise that path.

## Verification

- Booking lifecycle plus Vietnamese typography: **14 files, 89 tests passed**.
- A temporary browser route rendered the real `BookingCreateFormFields` component
  with a synthetic delayed catalog. Chromium at 1280px and 390px selected the hall
  and menu, submitted values matched the selected IDs, and catalog loading ran
  once. Screenshots were visually inspected for Vietnamese text and horizontal
  overflow. The temporary route was removed.
- CI now runs the booking lifecycle and typography tests on PRs and main before
  deployment, alongside the existing lint, typecheck and build gates.

This does not claim the complete management test suite passes. An exploratory
whole-suite run observed failures in billing, staff operations, catalog,
identity/dashboard and API tests, then stalled and was stopped. Its partial
output is not a complete failure count. Those suites are outside the 26-case
booking repair. The focused rerun above is the completed acceptance result.
