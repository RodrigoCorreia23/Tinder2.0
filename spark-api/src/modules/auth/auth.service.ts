import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/middleware/errorHandler';

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
  lookingFor: string[];
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function generateTokens(userId: string): Tokens {
  const accessToken = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });

  return { accessToken, refreshToken };
}

export async function signup(data: SignupData): Promise<{ user: any; tokens: Tokens }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      lookingFor: data.lookingFor,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      gender: true,
      createdAt: true,
    },
  });

  const tokens = generateTokens(user.id);

  return { user, tokens };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: any; tokens: Tokens }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const tokens = generateTokens(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      gender: user.gender,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    return generateTokens(user.id);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid refresh token', 401);
  }
}
