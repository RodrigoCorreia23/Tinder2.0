import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed nearby test users around YOUR current location.
 *
 * Usage: npx ts-node prisma/seed-nearby.ts [lat] [lng]
 * Example: npx ts-node prisma/seed-nearby.ts 38.7223 -9.1393
 *
 * If no coords provided, defaults to Lisbon center.
 */

const args = process.argv.slice(2);
const BASE_LAT = parseFloat(args[0]) || 38.7223;
const BASE_LNG = parseFloat(args[1]) || -9.1393;

// Generate random position within X meters
function randomNearby(lat: number, lng: number, maxMeters: number) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);

  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * maxMeters;

  return {
    lat: lat + (Math.sin(angle) * distance) / metersPerDegreeLat,
    lng: lng + (Math.cos(angle) * distance) / metersPerDegreeLng,
  };
}

const nearbyUsers = [
  // Within 200m (will show on map)
  {
    email: 'luna@test.com',
    firstName: 'Luna',
    dateOfBirth: new Date('1999-02-14'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Dancing through life. Salsa on Tuesdays, yoga on Fridays.',
    photo: 'https://randomuser.me/api/portraits/women/11.jpg',
    interests: ['Yoga', 'Travel', 'Wine', 'Pop', 'Fashion'],
    maxDistance: 100,
  },
  {
    email: 'marta@test.com',
    firstName: 'Marta',
    dateOfBirth: new Date('1998-07-03'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Coffee addict and book lover. Currently reading 3 books at once.',
    photo: 'https://randomuser.me/api/portraits/women/12.jpg',
    interests: ['Coffee', 'Reading', 'Jazz', 'Art', 'Podcasts'],
    maxDistance: 80,
  },
  {
    email: 'clara@test.com',
    firstName: 'Clara',
    dateOfBirth: new Date('2000-11-22'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Med student who needs someone to bring me coffee during exams.',
    photo: 'https://randomuser.me/api/portraits/women/13.jpg',
    interests: ['Science', 'Coffee', 'Running', 'Series', 'Cooking'],
    maxDistance: 150,
  },
  {
    email: 'iris@test.com',
    firstName: 'Iris',
    dateOfBirth: new Date('1997-04-18'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Photographer. I see beauty in everything, especially sunsets.',
    photo: 'https://randomuser.me/api/portraits/women/14.jpg',
    interests: ['Photography', 'Nature', 'Hiking', 'Travel', 'Art'],
    maxDistance: 120,
  },
  {
    email: 'eva@test.com',
    firstName: 'Eva',
    dateOfBirth: new Date('2001-08-30'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Gamer girl IRL. If you can beat me at Mario Kart, I\'ll buy dinner.',
    photo: 'https://randomuser.me/api/portraits/women/15.jpg',
    interests: ['Gaming', 'Anime', 'Electronic', 'Technology', 'Comedy'],
    maxDistance: 60,
  },
  {
    email: 'rita@test.com',
    firstName: 'Rita',
    dateOfBirth: new Date('1996-12-05'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Chef in training. Will cook you dinner on the second date.',
    photo: 'https://randomuser.me/api/portraits/women/16.jpg',
    interests: ['Cooking', 'Wine', 'Sushi', 'Brunch', 'Travel'],
    maxDistance: 90,
  },
  {
    email: 'alice@test.com',
    firstName: 'Alice',
    dateOfBirth: new Date('1999-06-11'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Startup founder by day, DJ by night. Yes, I sleep sometimes.',
    photo: 'https://randomuser.me/api/portraits/women/17.jpg',
    interests: ['Startups', 'Electronic', 'Festivals', 'Technology', 'Gym'],
    maxDistance: 170,
  },
  {
    email: 'valentina@test.com',
    firstName: 'Valentina',
    dateOfBirth: new Date('2000-02-14'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Born on Valentine\'s Day. Coincidence? I think not.',
    photo: 'https://randomuser.me/api/portraits/women/18.jpg',
    interests: ['R&B', 'Fashion', 'Movies', 'Brunch', 'Pets'],
    maxDistance: 130,
  },
  {
    email: 'sara@test.com',
    firstName: 'Sara',
    dateOfBirth: new Date('1998-09-27'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Surfer, swimmer, beach bum. The ocean is my therapy.',
    photo: 'https://randomuser.me/api/portraits/women/19.jpg',
    interests: ['Surfing', 'Swimming', 'Nature', 'Reggaeton', 'Photography'],
    maxDistance: 140,
  },
  {
    email: 'lara@test.com',
    firstName: 'Lara',
    dateOfBirth: new Date('1997-03-15'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Basketball player. 5\'10. Yes, I\'m tall. No, I don\'t play volleyball.',
    photo: 'https://randomuser.me/api/portraits/women/20.jpg',
    interests: ['Basketball', 'Gym', 'Hip Hop', 'Cooking', 'Comedy'],
    maxDistance: 50,
  },
  {
    email: 'nina@test.com',
    firstName: 'Nina',
    dateOfBirth: new Date('2001-05-09'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Space nerd. Let\'s talk about black holes on our first date.',
    photo: 'https://randomuser.me/api/portraits/women/21.jpg',
    interests: ['Space', 'Science', 'AI', 'Reading', 'Classical'],
    maxDistance: 110,
  },
  {
    email: 'catarina@test.com',
    firstName: 'Catarina',
    dateOfBirth: new Date('1999-10-31'),
    gender: 'female',
    lookingFor: ['male'],
    bio: 'Volunteering makes my heart full. Also chocolate.',
    photo: 'https://randomuser.me/api/portraits/women/22.jpg',
    interests: ['Volunteering', 'Pets', 'Yoga', 'Vegan', 'Nature'],
    maxDistance: 180,
  },
  // Some male profiles for testing both directions
  {
    email: 'rafael@test.com',
    firstName: 'Rafael',
    dateOfBirth: new Date('1998-01-20'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Architect who builds things by day and playlists by night.',
    photo: 'https://randomuser.me/api/portraits/men/11.jpg',
    interests: ['Art', 'Rock', 'Photography', 'Coffee', 'Cycling'],
    maxDistance: 100,
  },
  {
    email: 'diogo@test.com',
    firstName: 'Diogo',
    dateOfBirth: new Date('1997-05-17'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Personal trainer. I promise I won\'t make you do burpees on our date.',
    photo: 'https://randomuser.me/api/portraits/men/12.jpg',
    interests: ['Gym', 'Running', 'Cooking', 'Football', 'Hiking'],
    maxDistance: 75,
  },
  {
    email: 'lucas@test.com',
    firstName: 'Lucas',
    dateOfBirth: new Date('2000-08-12'),
    gender: 'male',
    lookingFor: ['female'],
    bio: 'Film student. I\'ll judge your Netflix taste gently.',
    photo: 'https://randomuser.me/api/portraits/men/13.jpg',
    interests: ['Movies', 'Theatre', 'Comedy', 'Jazz', 'Wine'],
    maxDistance: 160,
  },
];

async function main() {
  console.log(`\nSeeding ${nearbyUsers.length} nearby users around:`);
  console.log(`  Latitude:  ${BASE_LAT}`);
  console.log(`  Longitude: ${BASE_LNG}\n`);

  const passwordHash = await bcrypt.hash('test1234', 12);

  for (const testUser of nearbyUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    if (existing) {
      // Update location to be near the provided coordinates
      const pos = randomNearby(BASE_LAT, BASE_LNG, testUser.maxDistance);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          latitude: pos.lat,
          longitude: pos.lng,
          locationUpdatedAt: new Date(),
        },
      });
      console.log(`  Updated ${testUser.firstName} at ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (~${testUser.maxDistance}m)`);
      continue;
    }

    const pos = randomNearby(BASE_LAT, BASE_LNG, testUser.maxDistance);

    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        firstName: testUser.firstName,
        dateOfBirth: testUser.dateOfBirth,
        gender: testUser.gender,
        lookingFor: testUser.lookingFor,
        bio: testUser.bio,
        latitude: pos.lat,
        longitude: pos.lng,
        locationUpdatedAt: new Date(),
        reputationScore: 40 + Math.random() * 50,
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
    for (const interestName of testUser.interests) {
      const interest = await prisma.interest.findUnique({
        where: { name: interestName },
      });
      if (interest) {
        await prisma.userInterest.create({
          data: { userId: user.id, interestId: interest.id },
        });
      }
    }

    console.log(`  Created ${testUser.firstName} (${testUser.gender}) at ~${testUser.maxDistance}m`);
  }

  console.log(`\nDone! All users are within 200m of your location.`);
  console.log(`Password for all: test1234\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
