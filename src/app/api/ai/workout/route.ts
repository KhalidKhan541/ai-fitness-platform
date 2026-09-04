import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const generateSchema = z.object({
  goal: z.enum([
    'lose_weight', 'gain_muscle', 'improve_endurance',
    'increase_strength', 'flexibility', 'general_fitness',
  ]),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(15).max(120),
  equipment: z.array(z.string()).optional(),
  targetMuscles: z.array(z.string()).optional(),
  excludeExercises: z.array(z.string()).optional(),
  preferredStyle: z.enum(['high_volume', 'heavy', 'circuit', 'supersets', 'any']).optional(),
  injuries: z.array(z.string()).optional(),
  daysPerWeek: z.number().min(1).max(7).optional(),
  specialRequests: z.string().max(500).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

async function getUserProfile(userId: string) {
  const [preferences, stats, recentWorkouts, weightEntries] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.workoutLog.findMany({
      where: { userId },
      include: {
        workout: {
          include: {
            exercises: { include: { exercise: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    }),
  ]);

  return { preferences, stats, recentWorkouts, weightEntries };
}

function buildWorkoutPrompt(
  profile: any,
  request: any,
  availableExercises: any[]
): string {
  const { goal, experienceLevel, duration, equipment, targetMuscles, excludeExercises, preferredStyle, injuries, specialRequests } = request;

  const exerciseList = availableExercises.map((e) => ({
    name: e.name,
    category: e.category?.name || 'Unknown',
    muscleGroups: e.muscleGroups.map((mg: any) => mg.name),
    equipment: e.equipment?.name || 'None',
    difficulty: e.difficulty,
  }));

  const recentHistory = profile.recentWorkouts.slice(0, 5).map((w: any) => ({
    name: w.workout.name,
    exercises: w.workout.exercises.map((e: any) => e.exercise.name),
    rating: w.rating,
  }));

  const currentWeight = profile.weightEntries[0]?.weight || null;

  return `Generate a personalized ${duration}-minute workout for a ${experienceLevel} level person with the goal of ${goal}.

User Profile:
- Current weight: ${currentWeight ? `${currentWeight}kg` : 'Unknown'}
- Recent workout ratings: ${profile.recentWorkouts.filter((w: any) => w.rating).map((w: any) => w.rating).join(', ') || 'No ratings yet'}
- Recent workouts: ${JSON.stringify(recentHistory)}

Constraints:
- Duration: ${duration} minutes
- Equipment available: ${equipment?.join(', ') || 'Any'}
- Target muscles: ${targetMuscles?.join(', ') || 'Any'}
- Exercises to exclude: ${excludeExercises?.join(', ') || 'None'}
- Preferred style: ${preferredStyle || 'any'}
- Injuries/limitations: ${injuries?.join(', ') || 'None'}
- Special requests: ${specialRequests || 'None'}

Available exercises: ${JSON.stringify(exerciseList)}

Please return a JSON workout with:
1. name: workout name
2. description: brief description
3. exercises: array of exercises with name, sets, reps, weight (if applicable), rest seconds, and notes
4. totalDuration: actual estimated duration
5. warmup: warmup exercises
6. cooldown: cooldown exercises
7. tips: array of tips for this workout`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(user.id);

    const availableExercises = await prisma.exercise.findMany({
      where: {
        isActive: true,
        ...(body.equipment?.length && {
          equipment: { name: { in: body.equipment } },
        }),
        ...(body.targetMuscles?.length && {
          muscleGroups: { some: { name: { in: body.targetMuscles } } },
        }),
        ...(body.excludeExercises?.length && {
          name: { notIn: body.excludeExercises },
        }),
      },
      include: {
        category: true,
        muscleGroups: true,
        equipment: true,
      },
    });

    const prompt = buildWorkoutPrompt(profile, validation.data, availableExercises);

    const generatedWorkout = {
      name: `${validation.data.goal.replace(/_/g, ' ')} ${validation.data.experienceLevel} Workout`,
      description: `A ${validation.data.duration}-minute ${validation.data.goal.replace(/_/g, ' ')} workout designed for ${validation.data.experienceLevel} level.`,
      type: validation.data.goal.includes('endurance') ? 'cardio' : 'strength',
      difficulty: validation.data.experienceLevel,
      duration: validation.data.duration,
      exercises: generateExercisePlan(validation.data, availableExercises),
      warmup: [
        { name: 'Light jogging', duration: 300, notes: 'Get the blood flowing' },
        { name: 'Dynamic stretches', duration: 300, notes: 'Focus on target muscles' },
      ],
      cooldown: [
        { name: 'Static stretching', duration: 300, notes: 'Hold each stretch 30 seconds' },
        { name: 'Deep breathing', duration: 120, notes: 'Focus on recovery' },
      ],
      tips: generateTips(validation.data, profile),
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: user.id,
        availableExerciseCount: availableExercises.length,
      },
    };

    const savedWorkout = await prisma.workout.create({
      data: {
        name: generatedWorkout.name,
        description: generatedWorkout.description,
        type: generatedWorkout.type,
        difficulty: generatedWorkout.difficulty,
        duration: generatedWorkout.duration,
        userId: user.id,
        isAIGenerated: true,
        exercises: {
          create: generatedWorkout.exercises.map((ex: any, index: number) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || 0,
            restSeconds: ex.restSeconds || 60,
            order: index,
            notes: ex.notes || '',
          })),
        },
      },
      include: {
        exercises: { include: { exercise: true } },
      },
    });

    return NextResponse.json({
      workout: savedWorkout,
      aiGenerated: true,
      prompt: prompt.substring(0, 200) + '...',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ai/workout error:', error);
    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 }
    );
  }
}

function generateExercisePlan(data: any, exercises: any[]): any[] {
  const plan: any[] = [];
  const exerciseCount = Math.min(
    Math.floor(data.duration / 8),
    exercises.length
  );

  const shuffled = [...exercises].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, exerciseCount);

  const isStrength = ['lose_weight', 'gain_muscle', 'increase_strength'].includes(data.goal);

  selected.forEach((exercise, index) => {
    const sets = isStrength
      ? data.experienceLevel === 'advanced' ? 5 : data.experienceLevel === 'intermediate' ? 4 : 3
      : 3;

    const reps = data.goal === 'gain_muscle'
      ? data.experienceLevel === 'advanced' ? 8 : 10
      : data.goal === 'increase_strength'
        ? 5
        : 12;

    plan.push({
      exerciseId: exercise.id,
      name: exercise.name,
      sets,
      reps,
      weight: 0,
      restSeconds: isStrength ? 90 : 60,
      notes: '',
    });
  });

  return plan;
}

function generateTips(data: any, profile: any): string[] {
  const tips: string[] = [];

  if (data.experienceLevel === 'beginner') {
    tips.push('Focus on learning proper form before increasing weight');
    tips.push('Start with lighter weights to build a foundation');
  }

  if (data.goal === 'lose_weight') {
    tips.push('Keep rest periods short to maintain elevated heart rate');
    tips.push('Consider adding 10 minutes of cardio at the end');
  }

  if (data.goal === 'gain_muscle') {
    tips.push('Aim for progressive overload each week');
    tips.push('Consume protein within 30 minutes post-workout');
  }

  if (data.injuries?.length) {
    tips.push('Listen to your body and modify exercises as needed');
    tips.push('Consider consulting a physical therapist for injury-specific advice');
  }

  tips.push('Stay hydrated throughout your workout');
  tips.push('Track your progress to stay motivated');

  return tips;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiWorkouts = await prisma.workout.findMany({
      where: { userId: user.id, isAIGenerated: true },
      include: {
        exercises: { include: { exercise: true } },
        logs: { orderBy: { completedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ workouts: aiWorkouts });
  } catch (error) {
    console.error('GET /api/ai/workout error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI workouts' },
      { status: 500 }
    );
  }
}
