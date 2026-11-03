// Class Hỷ Yến v3 cho màn Danh mục (thay CSS cũ catalog-*, timeline-*, layout-*, media-*).
import { buttonVariants } from '../../components/ui/button';

// Ô nhập bên trong một nhãn: input, select, textarea cùng một kiểu.
const controls =
  '[&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:min-w-0 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-input [&_input:not([type=checkbox])]:bg-card [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:text-sm [&_input:not([type=checkbox])]:font-normal [&_input[type=file]]:py-2 [&_select]:h-11 [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-card [&_select]:px-3 [&_select]:text-sm [&_select]:font-normal [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-input [&_textarea]:bg-card [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:font-normal [&_:is(input,select,textarea):focus-visible]:ring-2 [&_:is(input,select,textarea):focus-visible]:ring-ring [&_:is(input,select,textarea):focus-visible]:outline-none [&_:is(input,select,textarea):disabled]:opacity-50';

const versionRow =
  'flex min-w-0 flex-wrap items-center justify-between gap-4 border-t border-border p-4 first:border-t-0 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground [&_strong]:mt-1.5 [&_strong]:block [&_strong]:font-semibold';

export const cx = {
  main: 'flex min-h-screen min-w-0 flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]',
  header: 'flex flex-wrap items-end justify-between gap-4',
  tabs: 'flex max-w-full gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--hy-outline)]',
  tab: 'inline-flex h-11 shrink-0 items-center border-b-2 border-transparent px-4 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:border-primary aria-selected:font-semibold aria-selected:text-primary',
  tabPanel: 'flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in-0 [&[hidden]]:hidden',
  section:
    'flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-hy-1',
  sectionHeading:
    'flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-6 py-4 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:basis-full [&_p]:text-xs [&_p]:text-muted-foreground',
  sectionToolbar:
    'flex flex-wrap items-center justify-between gap-4 border-b border-border pr-6 max-md:flex-col max-md:items-stretch max-md:px-6 max-md:pb-4 [&>div:first-child]:border-0 max-md:[&>div:first-child]:-mx-6',
  toolbarActions: `flex flex-wrap items-end justify-end gap-2.5 [&_label]:flex [&_label]:flex-col [&_label]:gap-1 [&_label]:text-xs [&_label]:font-semibold ${controls}`,
  formGrid: 'grid gap-5 p-6 sm:grid-cols-2',
  field: `flex min-w-0 flex-col gap-1.5 text-xs font-semibold ${controls}`,
  fieldWide: 'sm:col-span-full',
  formActions: 'flex flex-wrap items-center justify-end gap-2.5',
  rowActions: 'flex items-center gap-2 whitespace-nowrap',
  primaryButton: buttonVariants(),
  primaryLink: buttonVariants(),
  secondaryButton: buttonVariants({ variant: 'outline' }),
  dangerButton: buttonVariants({
    variant: 'ghost',
    className: 'text-destructive hover:bg-hy-error-bg',
  }),
  empty: 'px-6 py-9 text-center text-muted-foreground',
  error: 'rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error',
  help: 'text-xs font-normal text-muted-foreground',
  versionState: 'text-xs font-semibold text-primary',
  history: 'flex flex-col',
  versionRow,
  versionColumns: 'grid gap-6 px-6 pb-6 lg:grid-cols-2 [&>div]:min-w-0',
  splitGrid: 'grid gap-6 p-6 lg:grid-cols-2',
  editor: 'flex min-w-0 flex-col gap-4 rounded-xl border border-border p-5',
  editorHeading: 'border-b border-border pb-3 [&_h3]:text-base [&_h3]:font-semibold',
  subheading: 'border-b border-border py-4 text-base font-semibold',
  inlineControl: `grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 max-sm:grid-cols-1 ${controls}`,
  orderList:
    'flex flex-col gap-1.5 [&_li]:grid [&_li]:grid-cols-[minmax(0,1fr)_auto] [&_li]:items-center [&_li]:gap-2.5 [&_li]:rounded-lg [&_li]:border [&_li]:border-border [&_li]:py-1.5 [&_li]:pr-2 [&_li]:pl-3 [&_li>div]:flex [&_li>div]:gap-1',
  orderButton:
    'inline-flex size-9 items-center justify-center rounded-lg border border-input bg-card text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40',
  aggregateList: 'flex flex-col',
  aggregate: 'mt-3.5 overflow-hidden rounded-xl border border-border bg-card',
  aggregateHeader:
    'flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 [&_h4]:mt-1.5 [&_h4]:text-base [&_h4]:font-semibold',
  draftForm: `flex flex-col gap-3.5 border-t border-border p-4 first:border-t-0`,
  drawer:
    'm-6 overflow-hidden rounded-xl border border-border shadow-hy-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 [&>div:last-child]:px-6 [&>div:last-child]:pb-6',
  drawerHeading:
    'flex items-start justify-between gap-4 border-b border-border px-6 py-5 [&_h3]:text-base [&_h3]:font-semibold [&_button]:inline-flex [&_button]:size-10 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-lg [&_button]:border [&_button]:border-input [&_button]:hover:bg-muted',
  checkbox:
    'flex items-center gap-2.5 text-sm font-normal [&_input]:size-[18px] [&_input]:accent-[var(--hy-wine)]',
  tableScroll: 'overflow-x-auto',
  table:
    'w-full min-w-[640px] border-collapse text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td:last-child]:w-px [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground',
  retryState: 'flex flex-col items-start gap-4 p-6',
  loading: 'flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground',
  loadingMark:
    'size-10 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin',
  shiftGrid: 'grid gap-5 p-6 lg:grid-cols-2',
  shiftForm: 'flex flex-col gap-4 rounded-xl border border-border p-5',
  shiftFormTitle: 'flex items-start justify-between gap-4 [&_h3]:text-base [&_h3]:font-semibold',
  permissionPage: 'flex min-h-[60vh] items-center justify-center bg-background p-6',
  permissionPanel:
    'flex w-full max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-card p-8 shadow-hy-1 [&_h1]:text-xl [&_h1]:font-semibold',
  foodPanel: '',
  mediaSection: '',
  mediaToolbar: `mb-4 flex flex-wrap items-end gap-4 [&>*]:min-w-[200px] [&>*]:flex-1 ${controls}`,
  mediaGallery:
    'mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>li]:grid [&>li]:grid-rows-[auto_1fr_auto] [&>li]:overflow-hidden [&>li]:rounded-xl [&>li]:border [&>li]:border-border [&>li]:bg-card',
  mediaPreview: 'aspect-[3/2] overflow-hidden bg-muted [&_img]:size-full [&_img]:object-cover',
  mediaCardCopy:
    'flex flex-col gap-1 px-4 py-3.5 [&_small]:text-xs [&_small]:text-muted-foreground [&_span]:text-xs [&_span]:text-muted-foreground [&_strong]:font-semibold',
  mediaOrderActions: 'flex gap-1.5 px-4 pb-4',
  mediaUploadForm:
    'grid items-end gap-4 rounded-xl bg-muted p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] [&>div:first-child]:col-span-full',
  layoutSection: '',
  layoutCreate:
    'grid gap-4 sm:grid-cols-2 [&>button]:col-span-full [&>div:first-child]:col-span-full',
  layoutMetaGrid: 'grid gap-4 sm:grid-cols-2',
  layoutDraft: 'gap-5',
  layoutDraftHeading:
    'flex flex-wrap items-start justify-between gap-4 [&_h4]:mt-1 [&_h4]:text-base [&_h4]:font-semibold',
  layoutMetrics:
    'flex flex-wrap justify-end gap-1.5 max-sm:justify-start [&_span]:rounded-full [&_span]:border [&_span]:border-border [&_span]:bg-muted [&_span]:px-2.5 [&_span]:py-1 [&_span]:text-xs',
  layoutCanvas:
    'relative aspect-[16/8] w-full overflow-hidden rounded-xl border border-border bg-muted bg-[linear-gradient(var(--hy-outline)_1px,transparent_1px),linear-gradient(90deg,var(--hy-outline)_1px,transparent_1px)] bg-[size:24px_24px] max-sm:aspect-square',
  layoutCanvasTable:
    'absolute grid min-h-9 min-w-9 place-items-center rounded-md border border-hy-wine/50 bg-accent text-2xs font-semibold text-accent-foreground',
  layoutTableList: 'flex flex-col gap-3',
  layoutTableEditor: `grid min-w-0 items-end gap-2.5 rounded-xl border border-border p-4 sm:grid-cols-4 2xl:grid-cols-[minmax(9rem,1.4fr)_repeat(7,minmax(5.5rem,0.7fr))_auto] [&_code]:col-span-full [&_code]:text-2xs [&_code]:break-all [&_label]:flex [&_label]:flex-col [&_label]:gap-1 [&_label]:text-xs [&_label]:font-semibold [&_legend]:px-1.5 [&_legend]:text-xs [&_legend]:font-semibold ${controls}`,
  layoutVersionSummary:
    '[&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground',
  timelineEditor: 'min-w-0 overflow-hidden rounded-xl border border-border',
  timelineEditorHeading:
    'flex flex-wrap items-center justify-between gap-5 border-b border-border px-6 py-5 [&_h3]:text-base [&_h3]:font-semibold',
  timelineActions: 'px-6 pb-6',
  timelineList: 'pb-px',
  timelineItems:
    'flex flex-col px-6 [&>li]:grid [&>li]:grid-cols-[72px_minmax(0,1fr)_auto] [&>li]:items-start [&>li]:gap-4 [&>li]:border-t [&>li]:border-border [&>li]:py-5 [&>li:first-child]:border-t-0 max-sm:[&>li]:grid-cols-[56px_minmax(0,1fr)]',
  timelineItemOrder:
    'grid grid-cols-2 gap-1 [&_strong]:col-span-full [&_strong]:pb-1 [&_strong]:text-xs [&_strong]:font-semibold',
  timelineItemFields: `grid gap-3 md:grid-cols-[minmax(180px,1.6fr)_repeat(2,minmax(130px,0.7fr))] [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-semibold ${controls}`,
  timelineDescriptionField: 'md:col-span-full',
  timelineRemoveButton:
    'inline-flex size-9 items-center justify-center rounded-lg border border-input text-destructive transition-colors hover:bg-hy-error-bg disabled:opacity-40 max-sm:col-start-2',
  timelineHistoryVersion: versionRow,
  timelineDraft: 'border-t border-border first:border-t-0',
  timelineAggregate: 'm-6 overflow-hidden rounded-xl border border-border max-sm:m-4',
} as const;
