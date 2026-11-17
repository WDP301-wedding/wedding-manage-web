# Shared corners

Corner values live in `src/styles/tokens.css`. Tailwind radius utilities
in `src/styles/theme.css` reference those tokens; the global base layer applies the
continuous corner shape to existing components and portal content alike.

| Use | Token | Tailwind utility |
| --- | --- | --- |
| Compact details | `--hy-radius-xs` (8px) | `rounded-sm` |
| Inputs, selects, buttons, inset surfaces | `--hy-radius-sm` (16px) | `rounded-lg` |
| Cards, popovers, dialogs | `--hy-radius-md` (20px) | `rounded-xl` |
| Large panels | `--hy-radius-lg` (24px) | `rounded-2xl` |

Reuse `Input`, `Button`, `HySelect` and `DatePicker` for controls. Use the utilities
above for new surfaces. Custom CSS should reference a radius token rather than
introducing a pixel value or a separate corner-shape rule.

Browsers supporting `corner-shape` render squircles. Other browsers retain the
same radius tokens as ordinary rounded corners. `rounded-full` preserves circular
avatars and indicators. A custom circular control can use
`data-corner-shape="round"`; square edges retain `rounded-none`.

## Statistic cards

Use `StatCard`, `StatCardGroup` and `StatCardSkeleton` from
`src/components/ui/stat-card.tsx` for statistic cards outside Finance. Their shared
CSS module owns the consultation-card appearance, responsive layout, tones,
selection, focus, reduced motion and loading presentation.

Pass `label`, `value`, optional `description` and `tone`. An `onClick` turns a card
into a native button; `selected` adds the selected appearance and `aria-pressed`.
Keep data fetching, calculations, permissions and filter changes in the feature
component. Do not duplicate the markup or override card styling per page.
Use `layout="wide"` on groups containing money values so narrow screens stack
them rather than splitting long amounts across cramped columns.

Finance's revenue and payment overview cards retain their existing presentation.
