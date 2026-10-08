## Vietnamese typography

- All Vietnamese headings, labels and body text use the shared `--font-display`, `--font-body` or `--font-script` sans-serif tokens in `app/globals.css`. Never override them with Georgia, Times New Roman, Lora or another serif font, including fallback lists. Technical identifiers may use `--font-code`.
- Preserve authored case and normal letter spacing for Vietnamese. Do not use CSS uppercase or decorative tracking. Give headings enough line height for diacritics (at least 1.25).
- Any future serif branding must use a separate `.latin-wordmark` element containing only static Latin text with `lang="en"`. Never apply it to containers with Vietnamese text, dynamic venue names or translated copy.
- Keep source text in Unicode NFC. Inspect Vietnamese headings in a real browser at desktop and narrow mobile widths; successful text-content assertions alone cannot detect a glyph rendering defect.
- Before completing any UI change, run `npm test -- src/design-system/typography.test.ts` as well as the normal checks. This test scans every CSS file under `app/` and `src/`, including nested media rules, and checks JSX to prevent decorative wordmarks from containing translated or dynamic text. Do not weaken its policy to accommodate a new visual treatment.
- These Vietnamese rendering requirements take precedence over generic serif or uppercase suggestions in design references.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
