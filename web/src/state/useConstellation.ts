import { create } from 'zustand';
import { WS_EVENTS } from '@roots/shared';
import type {
  Person,
  PersonAddedPayload,
  PersonCardFields,
  PersonClaimedPayload,
  PersonDeletedPayload,
  PersonUpdatedPayload,
  RelationshipKind,
  Union,
  UnionAddedPayload,
} from '@roots/shared';
import { api, enterFamily } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { getMyPersonId, setMyPersonId } from '../lib/deviceToken';

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
  /** the star this device claimed as "me" (home base), or null */
  meId: string | null;
  /** personId → resolved photo URL (presigned), filled lazily for orb/card/list */
  photoUrls: Record<string, string>;

  load: (slug: string) => Promise<void>;
  resync: () => Promise<void>;
  claim: (personId: string) => Promise<void>;
  updatePerson: (personId: string, fields: Partial<PersonCardFields>) => Promise<void>;
  addRelative: (args: {
    name: string;
    relationship: RelationshipKind;
    anchorPersonId: string;
    otherParentId?: string;
  }) => Promise<Person | null>;
  uploadPhoto: (personId: string, blob: Blob) => Promise<void>;
  removePerson: (personId: string) => Promise<void>;
  /** ensure photoUrls[personId] is populated (presigned GET), if the person has a photo */
  ensurePhotoUrl: (personId: string) => Promise<void>;
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
  meId: null,
  photoUrls: {},

  load: async (slug: string) => {
    set({ loading: true, error: null });
    try {
      const info = await enterFamily(slug);
      const snap = await api.snapshot();
      // restore this device's "me" star (home base) if we've claimed one before
      const me = getMyPersonId(info.familyId);
      set({
        familyId: info.familyId,
        familyName: snap.family.name,
        people: snap.people,
        unions: snap.unions,
        meId: me && snap.people.some((p) => p.id === me) ? me : null,
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
    // optimistic: ignite + mark claimed locally; this becomes "my" home star
    const familyId = get().familyId;
    set({ ignitingId: personId, meId: personId });
    if (familyId) setMyPersonId(familyId, personId);
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

  updatePerson: async (personId, fields) => {
    // optimistic merge
    const prev = get().people.find((p) => p.id === personId);
    set((s) => ({
      people: s.people.map((p) => (p.id === personId ? { ...p, ...fields } : p)),
    }));
    try {
      const updated = await api.updatePerson(personId, fields);
      set((s) => ({ people: s.people.map((p) => (p.id === personId ? updated : p)) }));
    } catch {
      if (prev) set((s) => ({ people: s.people.map((p) => (p.id === personId ? prev : p)) }));
    }
  },

  addRelative: async ({ name, relationship, anchorPersonId, otherParentId }) => {
    try {
      const res = await api.addPerson({
        fields: { name } as PersonCardFields,
        attach: { anchorPersonId, relationship, otherParentId },
      });
      set((s) => ({
        people: s.people.some((p) => p.id === res.person.id)
          ? s.people
          : [...s.people, res.person],
        unions:
          res.union && !s.unions.some((u) => u.id === res.union!.id)
            ? [...s.unions, res.union]
            : s.unions,
      }));
      return res.person;
    } catch {
      /* surfaced via UI disabled state; resync will reconcile */
      void get().resync();
      return null;
    }
  },

  uploadPhoto: async (personId, file) => {
    const photoKey = await api.uploadPhoto(personId, file);
    set((s) => ({
      people: s.people.map((p) => (p.id === personId ? { ...p, photoKey } : p)),
    }));
    // refresh the resolved URL so the orb/card show the new face immediately
    try {
      const { url } = await api.photoUrl(personId);
      if (url) set((s) => ({ photoUrls: { ...s.photoUrls, [personId]: url } }));
    } catch {
      /* non-fatal */
    }
  },

  ensurePhotoUrl: async (personId) => {
    if (get().photoUrls[personId]) return;
    const person = get().people.find((p) => p.id === personId);
    if (!person?.photoKey) return;
    try {
      const { url } = await api.photoUrl(personId);
      if (url) set((s) => ({ photoUrls: { ...s.photoUrls, [personId]: url } }));
    } catch {
      /* non-fatal */
    }
  },

  removePerson: async (personId) => {
    const prev = get().people;
    set({ people: prev.filter((p) => p.id !== personId) }); // optimistic
    try {
      await api.deletePerson(personId);
    } catch {
      set({ people: prev });
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
