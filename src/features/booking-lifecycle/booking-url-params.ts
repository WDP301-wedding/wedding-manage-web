import { type BookingPrefill, parseConsultationChoices } from './booking-helpers';

export interface ParsedBookingUrlParams {
  bookingId?: string | undefined;
  consultationId?: string | undefined;
  prefill?: BookingPrefill | undefined;
}

export function parseBookingUrlParams(search: string): ParsedBookingUrlParams {
  const params = new URLSearchParams(search);
  const bId = params.get('bookingId');
  const id = params.get('consultationId');
  const dName = params.get('displayName') || undefined;
  const em = params.get('email') || undefined;
  const nt = params.get('note') || undefined;
  const pDate = params.get('preferredDate')?.slice(0, 10) || undefined;
  const expGuestsParam = params.get('expectedGuests');
  const expG =
    expGuestsParam && !Number.isNaN(Number(expGuestsParam)) ? Number(expGuestsParam) : undefined;

  const parsedChoices = parseConsultationChoices(nt);
  const prefHall = params.get('preferredHall') || parsedChoices.hallName;
  const prefMenu = params.get('preferredMenu') || parsedChoices.menuName;
  const paramShift = params.get('preferredShift');
  const prefShift =
    paramShift === 'LUNCH' || paramShift === 'DINNER' ? paramShift : parsedChoices.shift;

  const prefill =
    dName || em || nt || pDate || expG || prefHall || prefMenu || prefShift
      ? {
          displayName: dName,
          email: em,
          note: nt,
          eventDate: pDate,
          expectedGuests: expG,
          preferredHallName: prefHall,
          preferredMenuName: prefMenu,
          preferredShift: prefShift,
        }
      : undefined;

  const validUuid = /^[a-f0-9-]{36}$/iu;

  if (bId && validUuid.test(bId)) {
    return { bookingId: bId };
  }
  if (id && validUuid.test(id)) {
    return { consultationId: id, prefill };
  }

  if (prefill) {
    return { prefill };
  }

  return {};
}
