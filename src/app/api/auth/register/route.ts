import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  fitnessGoal: z.enum([
    'lose_weight',
    'gain_muscle',
    'maintain',
    'improve_endurance',
    'general_fitness',
    'flexibility',
  ]).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterInput = z.infer<typeof registerSchema>;

function validateInput(data: unknown): { success: true; data: RegisterInput } | { success: false; error: string } {
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return { success: false, error: firstError.message };
  }
  return { success: true, data: result.data };
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

async function checkEmailExists(email: string): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  return !!existingUser;
}

async function createUser(data: RegisterInput) {
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const user = await prisma.user.create({
    data: {
      name: sanitizeInput(data.name),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      profileComplete: false,
    },
  });

  await prisma.userPreferences.create({
    data: {
      userId: user.id,
      weightUnit: 'kg',
      heightUnit: 'cm',
      language: 'en',
      theme: 'system',
      notifications: true,
    },
  });

  await prisma.userStats.create({
    data: {
      userId: user.id,
      totalWorkouts: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  });

  const onboardingData: Record<string, any> = {};
  if (data.dateOfBirth) onboardingData.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender) onboardingData.gender = data.gender;
  if (data.fitnessGoal) onboardingData.fitnessGoal = data.fitnessGoal;
  if (data.experienceLevel) onboardingData.experienceLevel = data.experienceLevel;

  if (Object.keys(onboardingData).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: onboardingData,
    });
  }

  return user;
}

function generateWelcomeNotifications(userId: string) {
  return prisma.notification.createMany({
    data: [
      {
        userId,
        type: 'WELCOME',
        title: 'Welcome to AI Fitness Platform! 🎉',
        message: 'Start your fitness journey today. Complete your profile to get personalized recommendations.',
        read: false,
      },
      {
        userId,
        type: 'TIP',
        title: 'Quick Tip',
        message: 'Set your first goal to start tracking your progress towards your fitness objectives.',
        read: false,
      },
      {
        userId,
        type: 'TIP',
        title: 'Getting Started',
        message: 'Browse our exercise library to find exercises that match your fitness level.',
        read: false,
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validation = validateInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { data } = validation;

    const emailExists = await checkEmailExists(data.email);
    if (emailExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const user = await createUser(data);

    await generateWelcomeNotifications(user.id);

    const { password: _, ...userWithoutPassword } = user as any;

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (error?.code === 'P1000') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
