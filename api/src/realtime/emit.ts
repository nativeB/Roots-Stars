import { WS_EVENTS } from '@roots/shared';
import type {
  PersonAddedPayload,
  PersonClaimedPayload,
  PersonDeletedPayload,
  PersonUpdatedPayload,
  UnionAddedPayload,
} from '@roots/shared';
import { getIO } from './io.js';

/** Typed broadcast helpers, all scoped to a family room. */

function emit(familyId: string, event: string, payload: unknown) {
  getIO()?.to(familyId).emit(event, payload);
}

export const broadcast = {
  personAdded: (familyId: string, p: PersonAddedPayload) =>
    emit(familyId, WS_EVENTS.personAdded, p),
  personClaimed: (familyId: string, p: PersonClaimedPayload) =>
    emit(familyId, WS_EVENTS.personClaimed, p),
  personUpdated: (familyId: string, p: PersonUpdatedPayload) =>
    emit(familyId, WS_EVENTS.personUpdated, p),
  personDeleted: (familyId: string, p: PersonDeletedPayload) =>
    emit(familyId, WS_EVENTS.personDeleted, p),
  unionAdded: (familyId: string, p: UnionAddedPayload) => emit(familyId, WS_EVENTS.unionAdded, p),
};
