import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const interests = [
  // Music
  { name: 'Rock', category: 'music' },
  { name: 'Hip Hop', category: 'music' },
  { name: 'Electronic', category: 'music' },
  { name: 'Jazz', category: 'music' },
  { name: 'Pop', category: 'music' },
  { name: 'R&B', category: 'music' },
  { name: 'Classical', category: 'music' },
  { name: 'Reggaeton', category: 'music' },

  // Sports
  { name: 'Football', category: 'sports' },
  { name: 'Basketball', category: 'sports' },
  { name: 'Tennis', category: 'sports' },
  { name: 'Gym', category: 'sports' },
  { name: 'Yoga', category: 'sports' },
  { name: 'Running', category: 'sports' },
  { name: 'Swimming', category: 'sports' },
  { name: 'Hiking', category: 'sports' },
  { name: 'Surfing', category: 'sports' },
  { name: 'Cycling', category: 'sports' },

  // Food & Drink
  { name: 'Cooking', category: 'food' },
  { name: 'Wine', category: 'food' },
  { name: 'Coffee', category: 'food' },
  { name: 'Vegan', category: 'food' },
  { name: 'Sushi', category: 'food' },
  { name: 'Brunch', category: 'food' },
  { name: 'Craft Beer', category: 'food' },

  // Entertainment
  { name: 'Movies', category: 'entertainment' },
  { name: 'Series', category: 'entertainment' },
  { name: 'Anime', category: 'entertainment' },
  { name: 'Gaming', category: 'entertainment' },
  { name: 'Reading', category: 'entertainment' },
  { name: 'Podcasts', category: 'entertainment' },
  { name: 'Theatre', category: 'entertainment' },
  { name: 'Comedy', category: 'entertainment' },

  // Lifestyle
  { name: 'Travel', category: 'lifestyle' },
  { name: 'Photography', category: 'lifestyle' },
  { name: 'Art', category: 'lifestyle' },
  { name: 'Fashion', category: 'lifestyle' },
  { name: 'Pets', category: 'lifestyle' },
  { name: 'Nature', category: 'lifestyle' },
  { name: 'Volunteering', category: 'lifestyle' },
  { name: 'Festivals', category: 'lifestyle' },

  // Tech & Science
  { name: 'Technology', category: 'tech' },
  { name: 'Startups', category: 'tech' },
  { name: 'Science', category: 'tech' },
  { name: 'Space', category: 'tech' },
  { name: 'AI', category: 'tech' },
];

const testUsers = [
  {
    email: 'sofia@test.com',
    firstName: 'Sofia',
    dateOfBirth: new Date('1998-05-15'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Love hiking, coffee and good conversations. Looking for someone genuine.',
    photo: 'https://randomuser.me/api/portraits/women/1.jpg',
    interestNames: ['Hiking', 'Coffee', 'Travel', 'Photography', 'Yoga'],
  },
  {
    email: 'maria@test.com',
    firstName: 'Maria',
    dateOfBirth: new Date('1999-08-22'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Foodie and adventure seeker. Let\'s explore the world together!',
    photo: 'https://randomuser.me/api/portraits/women/2.jpg',
    interestNames: ['Cooking', 'Sushi', 'Travel', 'Movies', 'Wine'],
  },
  {
    email: 'ana@test.com',
    firstName: 'Ana',
    dateOfBirth: new Date('2000-03-10'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Gym girl who also loves a good book. Balance is everything.',
    photo: 'https://randomuser.me/api/portraits/women/3.jpg',
    interestNames: ['Gym', 'Reading', 'Coffee', 'Pop', 'Fashion'],
  },
  {
    email: 'beatriz@test.com',
    firstName: 'Beatriz',
    dateOfBirth: new Date('1997-11-28'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Tech nerd by day, festival queen by night.',
    photo: 'https://randomuser.me/api/portraits/women/4.jpg',
    interestNames: ['Technology', 'AI', 'Festivals', 'Electronic', 'Gaming'],
  },
  {
    email: 'carolina@test.com',
    firstName: 'Carolina',
    dateOfBirth: new Date('2001-01-05'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Artist and dreamer. Looking for my muse.',
    photo: 'https://randomuser.me/api/portraits/women/5.jpg',
    interestNames: ['Art', 'Photography', 'Jazz', 'Theatre', 'Nature'],
  },
  {
    email: 'diana@test.com',
    firstName: 'Diana',
    dateOfBirth: new Date('1996-07-19'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Surfer girl from Ericeira. Catch me at the beach.',
    photo: 'https://randomuser.me/api/portraits/women/6.jpg',
    interestNames: ['Surfing', 'Nature', 'Pets', 'Brunch', 'Running'],
  },
  {
    email: 'ines@test.com',
    firstName: 'Ines',
    dateOfBirth: new Date('1999-12-03'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Netflix, wine and deep talks. Introvert with a wild side.',
    photo: 'https://randomuser.me/api/portraits/women/7.jpg',
    interestNames: ['Series', 'Wine', 'Podcasts', 'Comedy', 'Cooking'],
  },
  {
    email: 'joana@test.com',
    firstName: 'Joana',
    dateOfBirth: new Date('1998-09-14'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Basketball player and anime nerd. Yes, both.',
    photo: 'https://randomuser.me/api/portraits/women/8.jpg',
    interestNames: ['Basketball', 'Anime', 'Gaming', 'Hip Hop', 'Startups'],
  },
  // Some male profiles too
  {
    email: 'miguel@test.com',
    firstName: 'Miguel',
    dateOfBirth: new Date('1997-04-20'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Developer who loves rock music and hiking.',
    photo: 'https://randomuser.me/api/portraits/men/1.jpg',
    interestNames: ['Rock', 'Hiking', 'Technology', 'Coffee', 'Gaming'],
  },
  {
    email: 'tiago@test.com',
    firstName: 'Tiago',
    dateOfBirth: new Date('1996-06-11'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Football fanatic and amateur chef. Feed me and I\'m yours.',
    photo: 'https://randomuser.me/api/portraits/men/2.jpg',
    interestNames: ['Football', 'Cooking', 'Craft Beer', 'Travel', 'Comedy'],
  },
  {
    email: 'pedro@test.com',
    firstName: 'Pedro',
    dateOfBirth: new Date('2000-02-28'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Photographer exploring the world one shot at a time.',
    photo: 'https://randomuser.me/api/portraits/men/3.jpg',
    interestNames: ['Photography', 'Travel', 'Art', 'Nature', 'Jazz'],
  },
  {
    email: 'andre@test.com',
    firstName: 'Andre',
    dateOfBirth: new Date('1999-10-07'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Gym + yoga + good vibes. Let\'s grab a smoothie.',
    photo: 'https://randomuser.me/api/portraits/men/4.jpg',
    interestNames: ['Gym', 'Yoga', 'Running', 'Vegan', 'Cycling'],
  },
];

async function main() {
  console.log('Seeding interests...');

  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { name: interest.name },
      update: {},
      create: interest,
    });
  }

  console.log(`Seeded ${interests.length} interests`);

  // Seed test users
  console.log('Seeding test users...');
  const passwordHash = await bcrypt.hash('test1234', 12);

  // Lisbon area coordinates with slight variations
  const baseLat = 38.7223;
  const baseLng = -9.1393;

  for (const testUser of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    if (existing) {
      console.log(`  Skipping ${testUser.firstName} (already exists)`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        firstName: testUser.firstName,
        dateOfBirth: testUser.dateOfBirth,
        gender: testUser.gender,
        lookingFor: testUser.lookingFor,
        bio: testUser.bio,
        latitude: baseLat + (Math.random() - 0.5) * 0.01,
        longitude: baseLng + (Math.random() - 0.5) * 0.01,
        locationUpdatedAt: new Date(),
        reputationScore: 40 + Math.random() * 50, // 40-90
      },
    });

    // Add photo
    await prisma.userPhoto.create({
      data: {
        userId: user.id,
        url: testUser.photo,
        position: 0,
      },
    });

    // Add interests
    for (const interestName of testUser.interestNames) {
      const interest = await prisma.interest.findUnique({
        where: { name: interestName },
      });
      if (interest) {
        await prisma.userInterest.create({
          data: { userId: user.id, interestId: interest.id },
        });
      }
    }

    console.log(`  Created ${testUser.firstName} (${testUser.gender})`);
  }

  console.log(`Seeded ${testUsers.length} test users`);
  console.log('\nTest login: any email above with password "test1234"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
