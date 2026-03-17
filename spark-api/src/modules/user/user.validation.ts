import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    bio: z.string().max(500).optional(),
    gender: z.enum(['male', 'female', 'non_binary', 'other']).optional(),
    lookingFor: z.array(z.enum(['male', 'female', 'non_binary', 'other'])).min(1).optional(),
    ageMin: z.number().min(18).max(99).optional(),
    ageMax: z.number().min(18).max(99).optional(),
    maxDistanceKm: z.number().min(1).max(200).optional(),
  }),
});

export const updateLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const updateInterestsSchema = z.object({
  body: z.object({
    interestIds: z.array(z.number()).min(3, 'Select at least 3 interests').max(15),
  }),
});

export const reorderPhotosSchema = z.object({
  body: z.object({
    photoIds: z.array(z.string()),
  }),
});
