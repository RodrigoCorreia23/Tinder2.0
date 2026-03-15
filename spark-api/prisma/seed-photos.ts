import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Add extra photos to all test users.
 * Run: npx ts-node prisma/seed-photos.ts
 */

// Extra portrait photos from randomuser.me
const extraWomenPhotos: Record<string, string[]> = {
  'luna@test.com': [
    'https://randomuser.me/api/portraits/women/31.jpg',
    'https://randomuser.me/api/portraits/women/41.jpg',
    'https://randomuser.me/api/portraits/women/51.jpg',
  ],
  'marta@test.com': [
    'https://randomuser.me/api/portraits/women/32.jpg',
    'https://randomuser.me/api/portraits/women/42.jpg',
  ],
  'clara@test.com': [
    'https://randomuser.me/api/portraits/women/33.jpg',
    'https://randomuser.me/api/portraits/women/43.jpg',
    'https://randomuser.me/api/portraits/women/53.jpg',
  ],
  'iris@test.com': [
    'https://randomuser.me/api/portraits/women/34.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
  ],
  'eva@test.com': [
    'https://randomuser.me/api/portraits/women/35.jpg',
    'https://randomuser.me/api/portraits/women/45.jpg',
    'https://randomuser.me/api/portraits/women/55.jpg',
  ],
  'rita@test.com': [
    'https://randomuser.me/api/portraits/women/36.jpg',
    'https://randomuser.me/api/portraits/women/46.jpg',
  ],
  'alice@test.com': [
    'https://randomuser.me/api/portraits/women/37.jpg',
    'https://randomuser.me/api/portraits/women/47.jpg',
    'https://randomuser.me/api/portraits/women/57.jpg',
  ],
  'valentina@test.com': [
    'https://randomuser.me/api/portraits/women/38.jpg',
    'https://randomuser.me/api/portraits/women/48.jpg',
  ],
  'sara@test.com': [
    'https://randomuser.me/api/portraits/women/39.jpg',
    'https://randomuser.me/api/portraits/women/49.jpg',
    'https://randomuser.me/api/portraits/women/59.jpg',
  ],
  'lara@test.com': [
    'https://randomuser.me/api/portraits/women/40.jpg',
    'https://randomuser.me/api/portraits/women/50.jpg',
  ],
  'nina@test.com': [
    'https://randomuser.me/api/portraits/women/61.jpg',
    'https://randomuser.me/api/portraits/women/71.jpg',
    'https://randomuser.me/api/portraits/women/81.jpg',
  ],
  'catarina@test.com': [
    'https://randomuser.me/api/portraits/women/62.jpg',
    'https://randomuser.me/api/portraits/women/72.jpg',
  ],
  'rafael@test.com': [
    'https://randomuser.me/api/portraits/men/21.jpg',
    'https://randomuser.me/api/portraits/men/31.jpg',
  ],
  'diogo@test.com': [
    'https://randomuser.me/api/portraits/men/22.jpg',
    'https://randomuser.me/api/portraits/men/32.jpg',
    'https://randomuser.me/api/portraits/men/42.jpg',
  ],
  'lucas@test.com': [
    'https://randomuser.me/api/portraits/men/23.jpg',
    'https://randomuser.me/api/portraits/men/33.jpg',
  ],
  // Also add to the original seed users
  'sofia@test.com': [
    'https://randomuser.me/api/portraits/women/63.jpg',
    'https://randomuser.me/api/portraits/women/73.jpg',
  ],
  'maria@test.com': [
    'https://randomuser.me/api/portraits/women/64.jpg',
    'https://randomuser.me/api/portraits/women/74.jpg',
    'https://randomuser.me/api/portraits/women/84.jpg',
  ],
  'ana@test.com': [
    'https://randomuser.me/api/portraits/women/65.jpg',
    'https://randomuser.me/api/portraits/women/75.jpg',
  ],
  'beatriz@test.com': [
    'https://randomuser.me/api/portraits/women/66.jpg',
    'https://randomuser.me/api/portraits/women/76.jpg',
  ],
  'carolina@test.com': [
    'https://randomuser.me/api/portraits/women/67.jpg',
    'https://randomuser.me/api/portraits/women/77.jpg',
    'https://randomuser.me/api/portraits/women/87.jpg',
  ],
  'diana@test.com': [
    'https://randomuser.me/api/portraits/women/68.jpg',
    'https://randomuser.me/api/portraits/women/78.jpg',
  ],
  'ines@test.com': [
    'https://randomuser.me/api/portraits/women/69.jpg',
    'https://randomuser.me/api/portraits/women/79.jpg',
  ],
  'joana@test.com': [
    'https://randomuser.me/api/portraits/women/70.jpg',
    'https://randomuser.me/api/portraits/women/80.jpg',
    'https://randomuser.me/api/portraits/women/90.jpg',
  ],
  'miguel@test.com': [
    'https://randomuser.me/api/portraits/men/41.jpg',
    'https://randomuser.me/api/portraits/men/51.jpg',
  ],
  'tiago@test.com': [
    'https://randomuser.me/api/portraits/men/43.jpg',
    'https://randomuser.me/api/portraits/men/53.jpg',
  ],
  'pedro@test.com': [
    'https://randomuser.me/api/portraits/men/44.jpg',
    'https://randomuser.me/api/portraits/men/54.jpg',
    'https://randomuser.me/api/portraits/men/64.jpg',
  ],
  'andre@test.com': [
    'https://randomuser.me/api/portraits/men/45.jpg',
    'https://randomuser.me/api/portraits/men/55.jpg',
  ],
};

async function main() {
  console.log('Adding extra photos to test users...\n');

  for (const [email, photos] of Object.entries(extraWomenPhotos)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`  Skipping ${email} (not found)`);
      continue;
    }

    // Check how many photos they already have
    const existingCount = await prisma.userPhoto.count({
      where: { userId: user.id },
    });

    let added = 0;
    for (let i = 0; i < photos.length; i++) {
      const position = existingCount + i;
      if (position >= 6) break; // max 6 photos

      // Check if URL already exists
      const exists = await prisma.userPhoto.findFirst({
        where: { userId: user.id, url: photos[i] },
      });
      if (exists) continue;

      await prisma.userPhoto.create({
        data: {
          userId: user.id,
          url: photos[i],
          position,
        },
      });
      added++;
    }

    const total = existingCount + added;
    console.log(`  ${email}: ${added} photos added (${total} total)`);
  }

  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
