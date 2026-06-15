import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

for (const p of [resolve(process.cwd(), '../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) loadEnv({ path: p });
}

const prisma = new PrismaClient();

function slug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(22);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/**
 * The Krobeaba family — authoritative structure supplied by the host.
 * Matriarch Akua Mansa at the root; full lineage down to great-great-grandchildren.
 * Blood line only (partners linked later in-app).
 *
 * key → { name, deceased?, children?: [keys] }. Keys are unique (several display
 * names repeat across generations). Resolved into people + single-parent unions.
 */
type Node = { name: string; deceased?: boolean; children?: string[] };

const TREE: Record<string, Node> = {
  // G0
  akua: { name: 'Akua Mansa', deceased: true, children: [
    'matilda_oppong', 'esther_micah', 'elizabeth_aikins', 'george_acquaah',
    'hilda_acquaah', 'mercy_eghan', 'stella_tiurkson', 'georgina_acquaah', 'gerald_gaisie',
  ] },

  // ── G1: children of Akua Mansa ──
  matilda_oppong: { name: 'Matilda Oppong', deceased: true },

  esther_micah: { name: 'Esther Micah', deceased: true, children: [
    'philip_odoi', 'matilda_odoi', 'rebecca_odoi', 'george_odoi', 'hannah_odoi',
    'kweku_odoi', 'abba_odoi', 'esi_odoi',
  ] },

  elizabeth_aikins: { name: 'Elizabeth Aikins', deceased: true, children: ['kwesi_aikins'] },

  george_acquaah: { name: 'George Acquaah', deceased: true, children: [
    'georgina_nuertey', 'matilda_danso', 'sarah_ofori', 'mercy_naporu',
  ] },

  hilda_acquaah: { name: 'Hilda Acquaah', deceased: true, children: [
    'lucy_incoom', 'alex_incoom', 'rose_incoom',
  ] },

  mercy_eghan: { name: 'Mercy Eghan', deceased: true, children: [
    'ernest_eghan', 'edith_eghan', 'ekow_eghan', 'philomena_eghan', 'henry_eghan', 'mike_eghan', 'matilda_eghan',
  ] },

  stella_tiurkson: { name: 'Stella Tiurkson', children: ['thelma_tiurkson', 'rosemond_macashun'] },

  georgina_acquaah: { name: 'Georgina Acquaah', deceased: true },

  gerald_gaisie: { name: 'Gerald Acquaah-Gaisie', deceased: true, children: [
    'emelia_crenstil', 'josephine_gaisie', 'matilda_gaisie', 'samuel_gaisie',
  ] },

  // ── Esther Micah → Odoi ──
  philip_odoi: { name: 'Philip Y Odoi' },
  matilda_odoi: { name: 'Matilda Odoi', deceased: true },
  rebecca_odoi: { name: 'Rebecca Odoi', deceased: true },
  george_odoi: { name: 'George Odoi', children: ['gina_odoi', 'samantha_odoi'] },
  hannah_odoi: { name: 'Hannah S Odoi', deceased: true },
  kweku_odoi: { name: 'Kweku Odoi', children: ['dede_aamtey', 'eugenia_adjei', 'frederick_adjei'] },
  abba_odoi: { name: 'Abba Odoi' },
  esi_odoi: { name: 'Esi Odoi', children: ['esi', 'kwaku_a', 'efe_sarpy', 'adjoa', 'kwesi'] },
  gina_odoi: { name: 'Gina Odoi' },
  samantha_odoi: { name: 'Samantha Odoi' },
  dede_aamtey: { name: 'Dede Aamtey' },
  eugenia_adjei: { name: 'Eugenia Adjei' },
  frederick_adjei: { name: 'Frederick Adjei' },
  esi: { name: 'Esi' },
  kwaku_a: { name: 'Kwaku A' },
  efe_sarpy: { name: 'Efe Sarpy' },
  adjoa: { name: 'Adjoa' },
  kwesi: { name: 'Kwesi' },

  // ── Elizabeth Aikins → Kwesi Aikins ──
  kwesi_aikins: { name: 'Kwesi Aikins', children: ['sally_aikins', 'papa_aikins', 'kobbie_aikins', 'hannah_aikins'] },
  sally_aikins: { name: 'Sally L Aikins' },
  papa_aikins: { name: 'Papa Aikins' },
  kobbie_aikins: { name: 'Kobbie Aikins' },
  hannah_aikins: { name: 'Hannah Aikins' },

  // ── George Acquaah branch ──
  georgina_nuertey: { name: 'Georgina Nuertey', children: ['george_nuertey', 'benedict_nuertey', 'gloria_nuertey', 'joseph_nuertey'] },
  george_nuertey: { name: 'George Nuertey' },
  benedict_nuertey: { name: 'Benedict Nuertey' },
  gloria_nuertey: { name: 'Gloria Nuertey' },
  joseph_nuertey: { name: 'Joseph Nuertey' },
  matilda_danso: { name: 'Matilda Ayirebi-Danso', children: ['panyin_danso', 'kakra_danso'] },
  panyin_danso: { name: 'Panyin A B Danso' },
  kakra_danso: { name: 'Kakra A B Danso' },
  sarah_ofori: { name: 'Sarah Ofori-Ansah', children: ['laurencia_ofori', 'esther_ofori', 'abigail_ofori'] },
  laurencia_ofori: { name: 'Laurencia Ofori-Ansa' },
  esther_ofori: { name: 'Esther Ofori-Ansa' },
  abigail_ofori: { name: 'Abigail Ofori-Ansa' },
  mercy_naporu: { name: 'Mercy Naporu', children: ['elizabeth_duah', 'prince_asiedu', 'esther_asiedu', 'daine_asiedu', 'priscilla_asiedu'] },
  elizabeth_duah: { name: 'Elizabeth Duah' },
  prince_asiedu: { name: 'Prince Asiedu' },
  esther_asiedu: { name: 'Esther Asiedu' },
  daine_asiedu: { name: 'Daine Asiedu' },
  priscilla_asiedu: { name: 'Priscilla Asiedu' },

  // ── Hilda Acquaah → Incoom ──
  lucy_incoom: { name: 'Lucy K Incoom', children: ['hilda_incoom', 'ekow_incoom', 'araba_incoom'] },
  hilda_incoom: { name: 'Hilda Incoom' },
  ekow_incoom: { name: 'Ekow Incoom' },
  araba_incoom: { name: 'Araba Incoom' },
  alex_incoom: { name: 'Alex Incoom', deceased: true },
  rose_incoom: { name: 'Rose E Incoom' },

  // ── Mercy Eghan → Eghan ──
  ernest_eghan: { name: 'Ernest Eghan', children: ['gifty_eghan', 'ernest_w_eghan'] },
  edith_eghan: { name: 'Edith Eghan', children: ['baaba_hutchinson', 'quincy_hutchinson'] },
  ekow_eghan: { name: 'Ekow Eghan', children: ['michael_eghan', 'elsie_eghan'] },
  philomena_eghan: { name: 'Philomena Eghan', deceased: true },
  henry_eghan: { name: 'Henry Eghan', children: ['mercy_eghan_ii', 'ernest_eghan_ii'] },
  mike_eghan: { name: 'Mike Eghan', children: ['vanessa_eghan'] },
  matilda_eghan: { name: 'Matilda Eghan', children: ['alex_danso', 'alexis_danso', 'alexa_danso'] },
  gifty_eghan: { name: 'Gifty Eghan' },
  ernest_w_eghan: { name: 'Ernest W Eghan' },
  baaba_hutchinson: { name: 'Baaba Hutchinson' },
  quincy_hutchinson: { name: 'Quincy Hutchinson' },
  michael_eghan: { name: 'Michael Eghan' },
  elsie_eghan: { name: 'Elsie Eghan' },
  mercy_eghan_ii: { name: 'Mercy Eghan' },
  ernest_eghan_ii: { name: 'Ernest Eghan' },
  vanessa_eghan: { name: 'Vanessa Eghan' },
  alex_danso: { name: 'Alex Danso' },
  alexis_danso: { name: 'Alexis Danso' },
  alexa_danso: { name: 'Alexa Danso' },

  // ── Stella Tiurkson ──
  thelma_tiurkson: { name: 'Thelma Tiurkson', children: ['brody_hooton', 'nyree_hooton'] },
  rosemond_macashun: { name: 'Rosemond Mac-Ashun', children: ['samantha_donkor', 'michael_donkor', 'zoe_donkor', 'robert_wilberforce'] },
  brody_hooton: { name: 'Brody Hooton' },
  nyree_hooton: { name: 'Nyree Hooton' },
  samantha_donkor: { name: 'Samantha Donkor' },
  michael_donkor: { name: 'Michael Donkor' },
  zoe_donkor: { name: 'Zoe Donkor' },
  robert_wilberforce: { name: 'Robert Wilberforce', children: ['william_wilberforce'] },
  william_wilberforce: { name: 'William Wilberforce', children: ['robert_wilberforce_ii'] },
  robert_wilberforce_ii: { name: 'Robert Wilberforce' },

  // ── Gerald Acquaah-Gaisie ──
  emelia_crenstil: { name: 'Emelia Crenstil', deceased: true },
  josephine_gaisie: { name: 'Josephine Gaisie' },
  matilda_gaisie: { name: 'Matilda Gaisie', children: ['gaisie_1'] },
  samuel_gaisie: { name: 'Samuel Gaisie', children: ['gaisie_2', 'gaisie_1b'] },
  gaisie_1: { name: '1 Gaisie' },
  gaisie_2: { name: '2 Gaisie' },
  gaisie_1b: { name: '1 Gaisie' },
};

async function main() {
  const hostSecret = process.env.HOST_SECRET ?? 'dev-host-secret';
  const inviteSlug = process.env.DEV_SEED_SLUG?.trim() || slug();

  // sanity: every child key exists and has exactly one parent
  const seen = new Map<string, string>();
  for (const [key, node] of Object.entries(TREE)) {
    for (const c of node.children ?? []) {
      if (!TREE[c]) throw new Error(`Unknown child key "${c}" under ${key}`);
      if (seen.has(c)) throw new Error(`"${c}" has two parents: ${seen.get(c)} & ${key}`);
      seen.set(c, key);
    }
  }

  const family = await prisma.family.create({
    data: {
      name: 'The Krobeaba Family',
      inviteSlug,
      hostTokenHash: createHash('sha256').update(hostSecret).digest('hex'),
    },
  });
  const fid = family.id;

  const ids = new Map<string, string>();
  for (const [key, node] of Object.entries(TREE)) {
    const person = await prisma.person.create({
      data: { familyId: fid, name: node.name, isDeceased: Boolean(node.deceased) },
    });
    ids.set(key, person.id);
  }

  let unionCount = 0;
  for (const [key, node] of Object.entries(TREE)) {
    if (!node.children?.length) continue;
    const union = await prisma.union.create({
      data: { familyId: fid, partnerAId: ids.get(key)!, partnerBId: null, unionType: 'other' },
    });
    unionCount++;
    for (const c of node.children) {
      await prisma.person.update({ where: { id: ids.get(c)! }, data: { parentUnionId: union.id } });
    }
  }

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  console.log(`\n✦ Seeded "The Krobeaba Family" — ${ids.size} people, ${unionCount} unions`);
  console.log(`  Invite link: ${webOrigin}/j/${inviteSlug}`);
  console.log(`  Host secret: ${hostSecret}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
