# Print queue booking context and retained PDF session recovery

Consume backend `bookingSummary` for explicit couple names, event date and the
snapshotted hall. Display dates in Vietnamese without browser-timezone drift;
search also matches these names, hall and booking code. Missing legacy names
remain unknown rather than being reconstructed from an account display name.

Retained PDF fetch now preserves a 401 as ApiClientError so the existing session
can refresh and retry once. Temporary 502/503 responses have a retryable message.
No production transition or billing command is sent while opening a PDF.

Verification: print/appendix/typography suites passed (41 tests); dedicated expired
bearer/PDF retry regression passed. Backend separately fixes completed-event
retained access and health-probe availability. No APK build is involved.
