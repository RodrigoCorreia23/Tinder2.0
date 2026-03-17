import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    dateOfBirth: z.string().refine((date) => {
      const age = Math.floor(
        (Date.now() - new Date(date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      return age >= 18;
    }, 'Must be at least 18 years old'),
    gender: z.enum(['male', 'female', 'non_binary', 'other']),
    lookingFor: z.array(z.enum(['male', 'female', 'non_binary', 'other'])).min(1),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});
