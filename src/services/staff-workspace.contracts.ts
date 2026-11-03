import { z } from 'zod';
const uuid = z.uuid();
export const workKind = z.enum(['TASK', 'INCIDENT', 'HANDOVER']);
export const workStatus = z.enum(['OPEN', 'IN_PROGRESS', 'DONE']);
export const workPriority = z.enum(['NORMAL', 'URGENT']);
export const workItem = z.object({
  id: uuid,
  bookingId: uuid,
  kind: workKind,
  title: z.string(),
  description: z.string(),
  priority: workPriority,
  status: workStatus,
  assignedAccountId: uuid.nullable(),
  createdByAccountId: uuid,
  revision: z.int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const workPage = z.object({ items: z.array(workItem), nextAfterId: uuid.nullable() });
export const historyPage = z.object({
  items: z.array(
    z.object({
      revision: z.int().positive(),
      actorAccountId: uuid,
      createdAt: z.iso.datetime(),
      snapshot: z.record(z.string(), z.unknown()),
    }),
  ),
  nextAfterRevision: z.int().positive().nullable(),
});
export const eventPage = z.object({
  items: z.array(
    z.object({
      bookingId: uuid,
      bookingCode: z.string(),
      alias: z.string().nullable(),
      eventDate: z.iso.date(),
      hallName: z.string(),
      shiftCode: z.enum(['LUNCH', 'DINNER']),
      phase: z.enum(['CONFIRMED', 'COMPLETED']),
    }),
  ),
  nextAfterId: uuid.nullable(),
});
export const staffWorkspace = z.object({
  bookingId: uuid,
  bookingCode: z.string(),
  alias: z.string().nullable(),
  isManager: z.boolean(),
  settings: z.object({
    bookingId: uuid,
    checkInMode: z.enum(['NONE', 'BY_GUEST_NAME']),
    revision: z.int().positive(),
    locked: z.boolean(),
  }),
  attendance: z.object({
    measurementStatus: z.enum(['NOT_RECORDED', 'LISTED_GUESTS_ONLY']),
    checkedInGuestCount: z.int().nullable(),
    ledgerRevision: z.int(),
  }),
  listedGuestCount: z.int(),
  planningHeadcount: z.int(),
  windowOpen: z.boolean(),
  windowOpensAt: z.iso.datetime(),
  windowClosesAt: z.iso.datetime(),
  timeline: z.object({
    eventDate: z.iso.date(),
    hallName: z.string(),
    revisionNumber: z.int(),
    shiftStartTime: z.string(),
    shiftEndTime: z.string(),
    items: z.array(
      z.object({
        itemId: uuid,
        startTime: z.string(),
        title: z.string(),
        description: z.string().nullable(),
      }),
    ),
  }),
  seating: z.object({
    status: z.enum(['ABSENT', 'DRAFT', 'CONFIRMED', 'REQUIRES_REVIEW']),
    renderSnapshot: z.array(
      z.object({
        layoutTableId: uuid,
        tableLabel: z.string(),
        shape: z.enum(['ROUND', 'RECTANGLE']),
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        rotationDegrees: z.number(),
        guestGroupId: uuid.nullable(),
        guestGroupName: z.string().nullable(),
        color: z
          .string()
          .regex(/^#[a-f0-9]{6}$/i)
          .nullable(),
      }),
    ),
  }),
  members: z.array(z.object({ accountId: uuid, label: z.string() })),
});
export type StaffWorkspace = z.infer<typeof staffWorkspace>;
export type StaffEvent = z.infer<typeof eventPage>['items'][number];
export type WorkItem = z.infer<typeof workItem>;
export type WorkCreate = Pick<
  WorkItem,
  'kind' | 'title' | 'description' | 'priority' | 'assignedAccountId'
>;
export type WorkUpdate = {
  expectedRevision: number;
  status: WorkItem['status'];
  assignedAccountId?: string | null;
  note: string;
};
