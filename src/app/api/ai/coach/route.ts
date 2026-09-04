import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  context: z.enum(['general', 'workout', 'nutrition', 'progress', 'motivation']).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

async function getConversationContext(userId: string) {
  const [recentWorkouts, recentMeals, weightEntries, goals, achievements] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId },
      include: { workout: { select: { name: true, type: true } } },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
    prisma.meal.findMany({
      where: { userId },
      include: {
        foods: {
          include: { food: { select: { name: true, caloriesPerServing: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      take: 3,
    }),
    prisma.achievement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ]);

  return {
    recentWorkouts: recentWorkouts.map((w) => ({
      name: w.workout.name,
      type: w.workout.type,
      completedAt: w.completedAt,
      duration: w.duration,
      rating: w.rating,
    })),
    recentMeals: recentMeals.map((m) => ({
      name: m.name,
      type: m.type,
      date: m.date,
      totalCalories: m.foods.reduce(
        (acc, mf) => acc + mf.food.caloriesPerServing * mf.servingSize * mf.quantity,
        0
      ),
    })),
    weightHistory: weightEntries.map((w) => ({
      weight: w.weight,
      date: w.recordedAt,
    })),
    activeGoals: goals.map((g) => ({
      title: g.title,
      type: g.type,
      progress: g.progress,
    })),
    recentAchievements: achievements.map((a) => ({
      title: a.title,
      icon: a.icon,
      points: a.points,
    })),
  };
}

function generateAIResponse(
  userMessage: string,
  context: any,
  chatContext: string
): { response: string; suggestions: string[] } {
  const lowerMessage = userMessage.toLowerCase();

  const hasRecentWorkout = context.recentWorkouts.length > 0;
  const hasRecentMeal = context.recentMeals.length > 0;
  const hasWeightData = context.weightHistory.length > 0;
  const hasActiveGoals = context.activeGoals.length > 0;

  let response = '';
  const suggestions: string[] = [];

  if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) {
    if (hasRecentWorkout) {
      const lastWorkout = context.recentWorkouts[0];
      response = `I see your last workout was "${lastWorkout.name}" (${lastWorkout.type}) completed ${new Date(lastWorkout.completedAt).toLocaleDateString()}. `;
      if (lastWorkout.rating) {
        response += `You rated it ${lastWorkout.rating}/5. `;
      }
      response += `Would you like me to suggest a similar workout or something different?`;
      suggestions.push('Suggest a similar workout', 'Try something different', 'View workout history');
    } else {
      response = `It looks like you haven't logged any workouts yet. Let's get started! What type of workout are you interested in today?`;
      suggestions.push('Strength training', 'Cardio workout', 'Full body workout', 'Create a workout plan');
    }
  } else if (lowerMessage.includes('eat') || lowerMessage.includes('food') || lowerMessage.includes('nutrition') || lowerMessage.includes('diet')) {
    if (hasRecentMeal) {
      response = `Looking at your recent meals, you've been tracking consistently. `;
      const totalCalories = context.recentMeals.reduce((acc: number, m: any) => acc + m.totalCalories, 0);
      const avgCalories = Math.round(totalCalories / context.recentMeals.length);
      response += `Your average daily intake is around ${avgCalories} calories. `;
      response += `How can I help you with your nutrition goals?`;
      suggestions.push('Analyze my nutrition', 'Get meal suggestions', 'Set calorie targets', 'Review my macros');
    } else {
      response = `I'd love to help you with nutrition! Start by logging your meals, and I can provide personalized advice. What would you like to know?`;
      suggestions.push('Log a meal', 'Set nutrition goals', 'Get diet advice', 'Learn about macros');
    }
  } else if (lowerMessage.includes('weight') || lowerMessage.includes('progress')) {
    if (hasWeightData) {
      const currentWeight = context.weightHistory[0].weight;
      const startWeight = context.weightHistory[context.weightHistory.length - 1].weight;
      const change = currentWeight - startWeight;
      response = `Your current weight is ${currentWeight}kg. `;
      if (change !== 0) {
        response += `You've ${change > 0 ? 'gained' : 'lost'} ${Math.abs(change).toFixed(1)}kg since you started tracking. `;
      }
      response += `Keep up the consistent tracking! What's your goal?`;
      suggestions.push('View detailed progress', 'Set a weight goal', 'Get weight loss tips', 'Track measurements');
    } else {
      response = `Start tracking your weight to see your progress over time. Regular weigh-ins help you stay on track with your goals.`;
      suggestions.push('Log weight now', 'Set weight goal', 'Learn about weight tracking');
    }
  } else if (lowerMessage.includes('goal')) {
    if (hasActiveGoals) {
      response = `You have ${context.activeGoals.length} active goal${context.activeGoals.length > 1 ? 's' : ''}: `;
      context.activeGoals.forEach((g: any) => {
        response += `"${g.title}" (${g.progress}% complete) `;
      });
      response += `How can I help you progress towards these goals?`;
      suggestions.push('View goal details', 'Update progress', 'Create new goal', 'Get goal advice');
    } else {
      response = `Setting clear goals is the first step to success! What would you like to achieve?`;
      suggestions.push('Lose weight', 'Build muscle', 'Improve endurance', 'Create a custom goal');
    }
  } else if (lowerMessage.includes('motivation') || lowerMessage.includes('stuck') || lowerMessage.includes('help')) {
    response = `I'm here to help! `;
    if (context.recentAchievements.length > 0) {
      const latest = context.recentAchievements[0];
      response += `Remember when you earned "${latest.title}" ${latest.icon}? You've already shown you can achieve great things! `;
    }
    response += `What specific challenge are you facing? I can provide tailored advice to help you push through.`;
    suggestions.push('Share workout tips', 'Get meal prep ideas', 'Talk about challenges', 'Review my achievements');
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    response = `Hello! 👋 I'm your AI fitness coach. I can help you with workouts, nutrition, tracking progress, and staying motivated. What would you like to work on today?`;
    suggestions.push('Plan a workout', 'Get nutrition advice', 'Review my progress', 'Set new goals');
  } else if (lowerMessage.includes('thank')) {
    response = `You're welcome! I'm always here to support your fitness journey. Is there anything else you'd like help with?`;
    suggestions.push('Plan my next workout', 'Check my nutrition', 'See my achievements', 'Set new goals');
  } else {
    response = `That's a great question! Based on your profile, I can provide personalized advice. Could you tell me more about what you're looking for? I can help with workout planning, nutrition guidance, progress tracking, or general fitness advice.`;
    suggestions.push('Workout planning', 'Nutrition advice', 'Progress analysis', 'General fitness tips');
  }

  return { response, suggestions };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, conversationId, context } = validation.data;

    const conversationContext = await getConversationContext(user.id);

    const { response, suggestions } = generateAIResponse(
      message,
      conversationContext,
      context || 'general'
    );

    let conversation;
    if (conversationId) {
      conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: { messages: true },
      });

      if (!conversation || conversation.userId !== user.id) {
        conversation = await prisma.chatConversation.create({
          data: {
            userId: user.id,
            title: message.substring(0, 50),
          },
        });
      }

      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: message,
        },
      });

      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: response,
          metadata: JSON.stringify({ suggestions }),
        },
      });
    } else {
      conversation = await prisma.chatConversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 50),
          messages: {
            create: [
              { role: 'user', content: message },
              { role: 'assistant', content: response, metadata: JSON.stringify({ suggestions }) },
            ],
          },
        },
      });
    }

    return NextResponse.json({
      response,
      suggestions,
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/ai/coach error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      const conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json({ conversation });
    }

    const conversations = await prisma.chatConversation.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('GET /api/ai/coach error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
