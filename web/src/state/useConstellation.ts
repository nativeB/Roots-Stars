import { create } from 'zustand';
import { WS_EVENTS } from '@roots/shared';
import type {
  Person,
  PersonAddedPayload,
  PersonClaimedPayload,
  PersonDeletedPayload,
  PersonUpdatedPayload,
  Union,
  UnionAddedPayload,
} from '@roots/shared';
import { api, enterFamily } from '../lib/api';
import { connectSocket } from '../lib/socket';

interface ConstellationState {
  familyId: string | null;
  familyName: string;
  people: Person[];
  unions: Union[];
  loading: boolean;
  error: string | null;
  presence: number;
  /** person currently igniting (claim animation), or null */
  ignitingId: string | null;

  load: (slug: string) => Promise<void>;
  resync: () => Promise<void>;
  claim: (personId: string) => Promise<void>;
  setIgniting: (personId: string | null) => void;
}

export const useConstellation = create<ConstellationState>((set, get) => ({
  familyId: null,
  familyName: '',
  people: [],
  unions: [],
  loading: true,
  error: null,
  presence: 0,
  ignitingId: null,

  load: async (slug: string) => {
    set({ loading: true, error: null });
    try {
      const info = await enterFamily(slug);
      const snap = await api.snapshot();
      set({
        familyId: info.familyId,
        familyName: snap.family.name,
        people: snap.people,
        unions: snap.unions,
        loading: false,
      });
      wireSocket(info.familyId, set, get);
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not open the sky' });
    }
  },

  resync: async () => {
    try {
      const snap = await api.snapshot();
      set({ people: snap.people, unions: snap.unions, familyName: snap.family.name });
    } catch {
      /* keep current state on transient failure */
    }
  },

  claim: async (personId: string) => {
    // optimistic: ignite + mark claimed locally
    set({ ignitingId: personId });
    set((s) => ({
      people: s.people.map((p) =>
        p.id === personId ? { ...p, claimed: true, claimedAt: new Date().toISOString() } : p,
      ),
    }));
    try {
      await api.claimPerson(personId);
    } catch {
      // rollback claim on failure
      set((s) => ({
        people: s.people.map((p) =>
          p.id === personId ? { ...p, claimed: false, claimedAt: null } : p,
        ),
        ignitingId: null,
      }));
    }
  },

  setIgniting: (personId) => set({ ignitingId: personId }),
}));

function wireSocket(
  familyId: string,
  set: (partial: Partial<ConstellationState>) => void,
  get: () => ConstellationState,
) {
  const socket = connectSocket(familyId);

  socket.on('connect', () => void 0);
  socket.io.on('reconnect', () => void get().resync());

  socket.on(WS_EVENTS.presence, (p: { count: number }) => set({ presence: p.count }));

  socket.on(WS_EVENTS.personAdded, (p: PersonAddedPayload) => {
    const people = get().people;
    if (people.some((x) => x.id === p.person.id)) return;
    set({ people: [...people, p.person] });
  });

  socket.on(WS_EVENTS.unionAdded, (p: UnionAddedPayload) => {
    const unions = get().unions;
    if (unions.some((x) => x.id === p.union.id)) return;
    set({ unions: [...unions, p.union] });
  });

  socket.on(WS_EVENTS.personUpdated, (p: PersonUpdatedPayload) => {
    set({
      people: get().people.map((x) => (x.id === p.personId ? { ...x, ...p.fields } : x)),
    });
  });

  socket.on(WS_EVENTS.personClaimed, (p: PersonClaimedPayload) => {
    // a star lit up — reflect it and ignite for everyone watching
    set({
      people: get().people.map((x) =>
        x.id === p.personId ? { ...x, claimed: true, claimedAt: p.claimedAt } : x,
      ),
      ignitingId: p.personId,
    });
  });

  socket.on(WS_EVENTS.personDeleted, (p: PersonDeletedPayload) => {
    set({ people: get().people.filter((x) => x.id !== p.personId) });
  });
}
