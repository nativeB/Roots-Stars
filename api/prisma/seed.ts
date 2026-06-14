import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

for (const p of [resolve(process.cwd(), '../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) loadEnv({ path: p });
}

const prisma = new PrismaClient();

/** 22-char base62 — unguessable invite slug (~128 bits). */
function slug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(22);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function main() {
  const hostSecret = process.env.HOST_SECRET ?? 'dev-host-secret';
  // For local dev we use a stable slug so re-running is idempotent and the
  // invite link never changes. In prod (no DEV_SEED_SLUG) we mint a random one.
  const fixedSlug = process.env.DEV_SEED_SLUG?.trim() || undefined;
  const inviteSlug = fixedSlug ?? slug();
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

  if (fixedSlug) {
    const existing = await prisma.family.findUnique({ where: { inviteSlug: fixedSlug } });
    if (existing) {
      console.log('\n✦ Demo family already seeded — reusing it');
      console.log(`  Invite link: ${webOrigin}/j/${fixedSlug}`);
      console.log(`  Host secret: ${hostSecret}\n`);
      return;
    }
  }

  const family = await prisma.family.create({
    data: {
      name: 'The Demo Family',
      inviteSlug,
      hostTokenHash: createHash('sha256').update(hostSecret).digest('hex'),
    },
  });
  const fid = family.id;

  // Generation 0
  const edith = await prisma.person.create({
    data: { familyId: fid, name: 'Edith', signatureEmoji: '🪡', isDeceased: true },
  });
  const walter = await prisma.person.create({
    data: {
      familyId: fid,
      name: 'Walter',
      nickname: 'Wally',
      signatureEmoji: '🎻',
      birthMonth: 4,
      birthDay: 2,
      birthYear: 1948,
      birthplace: 'Kraków, Poland',
      currentLocation: 'Portland, OR',
      signatureDish: 'Pierogi (the real ones)',
      hiddenTalent: 'Can whistle two notes at once',
      song: 'Brahms — Hungarian Dance No. 5',
      askMeAbout: 'The boat he built in 1979',
      bio: 'Patriarch, fiddler, keeper of the family stories.',
    },
  });
  const carol = await prisma.person.create({
    data: { familyId: fid, name: 'Carol', signatureEmoji: '🌻' },
  });

  // Unions in gen 0: Edith+Walter, then Walter+Carol (remarriage)
  const uEW = await prisma.union.create({
    data: { familyId: fid, partnerAId: edith.id, partnerBId: walter.id, unionType: 'married' },
  });
  const uWC = await prisma.union.create({
    data: { familyId: fid, partnerAId: walter.id, partnerBId: carol.id, unionType: 'married' },
  });

  // Generation 1
  const maya = await prisma.person.create({
    data: { familyId: fid, name: 'Maya', signatureEmoji: '📷', parentUnionId: uEW.id },
  });
  await prisma.person.create({
    data: { familyId: fid, name: 'Theo', signatureEmoji: '🪐', parentUnionId: uEW.id },
  });
  await prisma.person.create({
    data: { familyId: fid, name: 'Iris', signatureEmoji: '🎨', parentUnionId: uWC.id }, // half-sibling
  });
  const devon = await prisma.person.create({
    data: { familyId: fid, name: 'Devon', signatureEmoji: '🎸' },
  });

  const uMD = await prisma.union.create({
    data: { familyId: fid, partnerAId: maya.id, partnerBId: devon.id, unionType: 'partners' },
  });

  // Generation 2 (minors)
  await prisma.person.create({
    data: {
      familyId: fid,
      name: 'Juniper',
      signatureEmoji: '🦊',
      parentUnionId: uMD.id,
      isMinor: true,
    },
  });
  await prisma.person.create({
    data: {
      familyId: fid,
      name: 'Rowan',
      signatureEmoji: '🐢',
      parentUnionId: uMD.id,
      isMinor: true,
    },
  });

  console.log('\n✦ Seeded "The Demo Family"');
  console.log(`  Invite link: ${webOrigin}/j/${inviteSlug}`);
  console.log(`  Host secret: ${hostSecret}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
