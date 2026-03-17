import { z } from 'zod';

export const createSwipeSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid(),
    direction: z.enum(['like', 'pass']),
    isSuperLike: z.boolean().optional(),
  }),
});
