import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, BodyMeasurement, ProgressPhoto, Prisma } from '@prisma/client';
import { format, subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();

export interface LogWeightInput {
  weight: number;
  unit: 'KG' | 'LBS';
  notes?: string;
}

export interface LogBodyFatInput {
  bodyFatPercentage: number;
  method?: 'CALIPERS' | 'BIA' | 'DEXA' | 'VISUAL' | 'OTHER';
  notes?: string;
}

export interface LogMeasurementsInput {
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  forearms?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  shoulders?: number;
  unit: 'CM' | 'INCHES';
  notes?: string;
}

export interface UploadProgressPhotoInput {
  imageUrl: string;
  angle: PhotoAngle;
  notes?: string;
  tags?: string[];
}

export type PhotoAngle = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'OTHER';

export interface BodyComposition {
  date: string;
  weight: number;
  bodyFatPercentage?: number;
  leanMass?: number;
  fatMass?: number;
  bmi?: number;
  muscleMass?: number;
}

export interface MeasurementProgress {
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  forearms?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  shoulders?: number;
}

export interface BodyStats {
  currentWeight: number;
  startingWeight: number;
  weightChange: number;
  weightChangePercent: number;
  currentBodyFat?: number;
  startingBodyFat?: number;
  bodyFatChange?: number;
  bmi: number;
  bmiCategory: string;
  idealWeightRange: { min: number; max: number };
  bodyFatCategories: BodyFatCategory;
  measurements: MeasurementProgress[];
  progressPhotos: ProgressPhoto[];
}

export interface BodyFatCategory {
  essentialFat: number;
  athletes: number;
  fitness: number;
  average: number;
  obese: number;
}

export interface WeightGoal {
  id: string;
  userId: string;
  targetWeight: number;
  startDate: Date;
  targetDate: Date;
  startingWeight: number;
  currentWeight: number;
  progress: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
}

export interface ProgressPhotoComparison {
  before: ProgressPhoto;
  after: ProgressPhoto;
  timeDifference: number;
  weightDifference?: number;
  bodyFatDifference?: number;
}

export class BodyService {
  private readonly BMI_CATEGORIES = [
    { max: 18.5, category: 'Underweight' },
    { max: 24.9, category: 'Normal weight' },
    { max: 29.9, category: 'Overweight' },
    { max: Infinity, category: 'Obese' },
  ];

  private readonly BODY_FAT_CATEGORIES: Record<string, BodyFatCategory> = {
    MALE: {
      essentialFat: 3,
      athletes: 11,
      fitness: 18,
      average: 25,
      obese: 30,
    },
    FEMALE: {
      essentialFat: 12,
      athletes: 16,
      fitness: 25,
      average: 32,
      obese: 35,
    },
  };

  private readonly IDEAL_WEIGHT_RANGES: Record<string, { min: number; max: number }> = {
    MALE: { min: 60, max: 90 },
    FEMALE: { min: 50, max: 75 },
  };

  async logWeight(userId: string, input: LogWeightInput): Promise<BodyMeasurement> {
    const weightKG = input.unit === 'LBS' ? input.weight * 0.453592 : input.weight;

    const existing = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    return prisma.bodyMeasurement.create({
      data: {
        id: uuidv4(),
        userId,
        weight: weightKG,
        height: existing?.height,
        bodyFatPercentage: existing?.bodyFatPercentage,
        notes: input.notes,
        measuredAt: new Date(),
      },
    });
  }

  async logBodyFat(userId: string, input: LogBodyFatInput): Promise<BodyMeasurement> {
    const existing = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    return prisma.bodyMeasurement.create({
      data: {
        id: uuidv4(),
        userId,
        weight: existing?.weight,
        height: existing?.height,
        bodyFatPercentage: input.bodyFatPercentage,
        notes: input.method ? `Method: ${input.method}. ${input.notes || ''}` : input.notes,
        measuredAt: new Date(),
      },
    });
  }

  async logMeasurements(
    userId: string,
    input: LogMeasurementsInput
  ): Promise<BodyMeasurement> {
    const existing = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const measurementsData: any = {};
    if (input.chest) measurementsData.chest = input.chest;
    if (input.waist) measurementsData.waist = input.waist;
    if (input.hips) measurementsData.hips = input.hips;
    if (input.biceps) measurementsData.biceps = input.biceps;
    if (input.forearms) measurementsData.forearms = input.forearms;
    if (input.thighs) measurementsData.thighs = input.thighs;
    if (input.calves) measurementsData.calves = input.calves;
    if (input.neck) measurementsData.neck = input.neck;
    if (input.shoulders) measurementsData.shoulders = input.shoulders;

    return prisma.bodyMeasurement.create({
      data: {
        id: uuidv4(),
        userId,
        weight: existing?.weight,
        height: existing?.height,
        bodyFatPercentage: existing?.bodyFatPercentage,
        measurements: JSON.stringify(measurementsData),
        unit: input.unit,
        notes: input.notes,
        measuredAt: new Date(),
      },
    });
  }

  async logFullMeasurement(
    userId: string,
    data: {
      weight?: number;
      weightUnit?: 'KG' | 'LBS';
      height?: number;
      heightUnit?: 'CM' | 'INCHES';
      bodyFatPercentage?: number;
      measurements?: LogMeasurementsInput;
      notes?: string;
    }
  ): Promise<BodyMeasurement> {
    const weightKG = data.weight
      ? data.weightUnit === 'LBS'
        ? data.weight * 0.453592
        : data.weight
      : undefined;

    const heightCM = data.height
      ? data.heightUnit === 'INCHES'
        ? data.height * 2.54
        : data.height
      : undefined;

    const measurementsJson = data.measurements
      ? JSON.stringify({
          chest: data.measurements.chest,
          waist: data.measurements.waist,
          hips: data.measurements.hips,
          biceps: data.measurements.biceps,
          forearms: data.measurements.forearms,
          thighs: data.measurements.thighs,
          calves: data.measurements.calves,
          neck: data.measurements.neck,
          shoulders: data.measurements.shoulders,
        })
      : undefined;

    return prisma.bodyMeasurement.create({
      data: {
        id: uuidv4(),
        userId,
        weight: weightKG,
        height: heightCM,
        bodyFatPercentage: data.bodyFatPercentage,
        measurements: measurementsJson,
        unit: data.measurements?.unit,
        notes: data.notes,
        measuredAt: new Date(),
      },
    });
  }

  async getBodyStats(userId: string): Promise<BodyStats> {
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'asc' },
    });

    if (measurements.length === 0) {
      return {
        currentWeight: 0,
        startingWeight: 0,
        weightChange: 0,
        weightChangePercent: 0,
        bmi: 0,
        bmiCategory: 'N/A',
        idealWeightRange: { min: 0, max: 0 },
        bodyFatCategories: this.BODY_FAT_CATEGORIES.MALE,
        measurements: [],
        progressPhotos: [],
      };
    }

    const firstMeasurement = measurements[0];
    const latestMeasurement = measurements[measurements.length - 1];

    const currentWeight = latestMeasurement.weight || 0;
    const startingWeight = firstMeasurement.weight || 0;
    const weightChange = currentWeight - startingWeight;
    const weightChangePercent = startingWeight > 0
      ? (weightChange / startingWeight) * 100
      : 0;

    const currentBodyFat = latestMeasurement.bodyFatPercentage;
    const startingBodyFat = firstMeasurement.bodyFatPercentage;
    const bodyFatChange = currentBodyFat && startingBodyFat
      ? currentBodyFat - startingBodyFat
      : undefined;

    const height = latestMeasurement.height || 170;
    const bmi = currentWeight > 0
      ? currentWeight / Math.pow(height / 100, 2)
      : 0;

    const bmiCategory = this.getBMICategory(bmi);
    const idealWeightRange = this.getIdealWeightRange(height);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const gender = user?.gender || 'MALE';
    const bodyFatCategories = this.BODY_FAT_CATEGORIES[gender] || this.BODY_FAT_CATEGORIES.MALE;

    const measurementProgress = this.formatMeasurementProgress(measurements);

    const progressPhotos = await prisma.progressPhoto.findMany({
      where: { userId },
      orderBy: { takenAt: 'desc' },
      take: 20,
    });

    return {
      currentWeight,
      startingWeight,
      weightChange: Math.round(weightChange * 10) / 10,
      weightChangePercent: Math.round(weightChangePercent * 10) / 10,
      currentBodyFat,
      startingBodyFat,
      bodyFatChange: bodyFatChange ? Math.round(bodyFatChange * 10) / 10 : undefined,
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      idealWeightRange,
      bodyFatCategories,
      measurements: measurementProgress,
      progressPhotos,
    };
  }

  private getBMICategory(bmi: number): string {
    for (const { max, category } of this.BMI_CATEGORIES) {
      if (bmi <= max) return category;
    }
    return 'Obese';
  }

  private getIdealWeightRange(heightCM: number): { min: number; max: number } {
    const heightM = heightCM / 100;
    const min = Math.round(18.5 * heightM * heightM * 10) / 10;
    const max = Math.round(24.9 * heightM * heightM * 10) / 10;
    return { min, max };
  }

  private formatMeasurementProgress(measurements: any[]): MeasurementProgress[] {
    return measurements
      .filter(m => m.measurements)
      .map(m => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(m.measurements);
        } catch {}

        return {
          date: format(m.measuredAt, 'yyyy-MM-dd'),
          chest: parsed.chest,
          waist: parsed.waist,
          hips: parsed.hips,
          biceps: parsed.biceps,
          forearms: parsed.forearms,
          thighs: parsed.thighs,
          calves: parsed.calves,
          neck: parsed.neck,
          shoulders: parsed.shoulders,
        };
      });
  }

  async getWeightHistory(userId: string, days: number = 30): Promise<{
    date: string;
    weight: number;
  }[]> {
    const startDate = subDays(new Date(), days);

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        weight: { not: null },
        measuredAt: { gte: startDate },
      },
      orderBy: { measuredAt: 'asc' },
    });

    return measurements.map(m => ({
      date: format(m.measuredAt, 'yyyy-MM-dd'),
      weight: m.weight || 0,
    }));
  }

  async getBodyFatHistory(userId: string, days: number = 30): Promise<{
    date: string;
    bodyFat: number;
  }[]> {
    const startDate = subDays(new Date(), days);

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        bodyFatPercentage: { not: null },
        measuredAt: { gte: startDate },
      },
      orderBy: { measuredAt: 'asc' },
    });

    return measurements.map(m => ({
      date: format(m.measuredAt, 'yyyy-MM-dd'),
      bodyFat: m.bodyFatPercentage || 0,
    }));
  }

  async getMeasurementsHistory(userId: string, days: number = 30): Promise<MeasurementProgress[]> {
    const startDate = subDays(new Date(), days);

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measurements: { not: null },
        measuredAt: { gte: startDate },
      },
      orderBy: { measuredAt: 'asc' },
    });

    return this.formatMeasurementProgress(measurements);
  }

  async uploadProgressPhoto(
    userId: string,
    input: UploadProgressPhotoInput
  ): Promise<ProgressPhoto> {
    return prisma.progressPhoto.create({
      data: {
        id: uuidv4(),
        userId,
        imageUrl: input.imageUrl,
        angle: input.angle,
        notes: input.notes,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        takenAt: new Date(),
      },
    });
  }

  async getProgressPhotos(userId: string, angle?: PhotoAngle): Promise<ProgressPhoto[]> {
    const where: Prisma.ProgressPhotoWhereInput = { userId };
    if (angle) where.angle = angle;

    return prisma.progressPhoto.findMany({
      where,
      orderBy: { takenAt: 'desc' },
    });
  }

  async deleteProgressPhoto(photoId: string): Promise<void> {
    await prisma.progressPhoto.delete({ where: { id: photoId } });
  }

  async compareProgressPhotos(
    userId: string,
    beforeDate: Date,
    afterDate: Date
  ): Promise<ProgressPhotoComparison | null> {
    const before = await prisma.progressPhoto.findFirst({
      where: {
        userId,
        takenAt: { lte: beforeDate },
      },
      orderBy: { takenAt: 'desc' },
    });

    const after = await prisma.progressPhoto.findFirst({
      where: {
        userId,
        takenAt: { gte: afterDate },
      },
      orderBy: { takenAt: 'asc' },
    });

    if (!before || !after) return null;

    const timeDifference = Math.ceil(
      (after.takenAt.getTime() - before.takenAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const beforeMeasurement = await prisma.bodyMeasurement.findFirst({
      where: {
        userId,
        measuredAt: { lte: before.takenAt },
      },
      orderBy: { measuredAt: 'desc' },
    });

    const afterMeasurement = await prisma.bodyMeasurement.findFirst({
      where: {
        userId,
        measuredAt: { lte: after.takenAt },
      },
      orderBy: { measuredAt: 'desc' },
    });

    const weightDifference =
      afterMeasurement?.weight && beforeMeasurement?.weight
        ? afterMeasurement.weight - beforeMeasurement.weight
        : undefined;

    const bodyFatDifference =
      afterMeasurement?.bodyFatPercentage && beforeMeasurement?.bodyFatPercentage
        ? afterMeasurement.bodyFatPercentage - beforeMeasurement.bodyFatPercentage
        : undefined;

    return {
      before,
      after,
      timeDifference,
      weightDifference: weightDifference
        ? Math.round(weightDifference * 10) / 10
        : undefined,
      bodyFatDifference: bodyFatDifference
        ? Math.round(bodyFatDifference * 10) / 10
        : undefined,
    };
  }

  async setHeight(userId: string, height: number, unit: 'CM' | 'INCHES'): Promise<void> {
    const heightCM = unit === 'INCHES' ? height * 2.54 : height;

    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    if (latest) {
      await prisma.bodyMeasurement.update({
        where: { id: latest.id },
        data: { height: heightCM },
      });
    } else {
      await prisma.bodyMeasurement.create({
        data: {
          id: uuidv4(),
          userId,
          height: heightCM,
          measuredAt: new Date(),
        },
      });
    }
  }

  async calculateBMI(weight: number, height: number): Promise<{
    bmi: number;
    category: string;
    healthyWeightRange: { min: number; max: number };
  }> {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const category = this.getBMICategory(bmi);

    const healthyWeightRange = {
      min: Math.round(18.5 * heightM * heightM * 10) / 10,
      max: Math.round(24.9 * heightM * heightM * 10) / 10,
    };

    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      healthyWeightRange,
    };
  }

  async getBodyFatCategories(gender: string): Promise<BodyFatCategory> {
    return this.BODY_FAT_CATEGORIES[gender] || this.BODY_FAT_CATEGORIES.MALE;
  }

  async getWeightGoal(userId: string): Promise<WeightGoal | null> {
    const goal = await prisma.weightGoal.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!goal) return null;

    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const currentWeight = latestMeasurement?.weight || goal.startingWeight;
    const totalToLose = Math.abs(goal.targetWeight - goal.startingWeight);
    const currentProgress = Math.abs(currentWeight - goal.startingWeight);
    const progress = totalToLose > 0 ? (currentProgress / totalToLose) * 100 : 0;

    return {
      id: goal.id,
      userId: goal.userId,
      targetWeight: goal.targetWeight,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      startingWeight: goal.startingWeight,
      currentWeight,
      progress: Math.min(100, Math.round(progress)),
      status: goal.status as any,
    };
  }

  async setWeightGoal(
    userId: string,
    targetWeight: number,
    targetDate: Date
  ): Promise<WeightGoal> {
    const existing = await prisma.weightGoal.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existing) {
      await prisma.weightGoal.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      });
    }

    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const startingWeight = latestMeasurement?.weight || 70;

    const goal = await prisma.weightGoal.create({
      data: {
        id: uuidv4(),
        userId,
        targetWeight,
        startDate: new Date(),
        targetDate,
        startingWeight,
        status: 'ACTIVE',
      },
    });

    return {
      id: goal.id,
      userId: goal.userId,
      targetWeight: goal.targetWeight,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      startingWeight: goal.startingWeight,
      currentWeight: startingWeight,
      progress: 0,
      status: 'ACTIVE',
    };
  }

  async updateWeightGoalProgress(userId: string): Promise<WeightGoal | null> {
    const goal = await this.getWeightGoal(userId);
    if (!goal) return null;

    if (goal.progress >= 100) {
      await prisma.weightGoal.update({
        where: { id: goal.id },
        data: { status: 'COMPLETED' },
      });

      return { ...goal, status: 'COMPLETED', progress: 100 };
    }

    return goal;
  }

  async getBodyCompositionHistory(
    userId: string,
    days: number = 90
  ): Promise<BodyComposition[]> {
    const startDate = subDays(new Date(), days);

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measuredAt: { gte: startDate },
      },
      orderBy: { measuredAt: 'asc' },
    });

    return measurements.map(m => {
      const weight = m.weight || 0;
      const bodyFat = m.bodyFatPercentage;
      const leanMass = bodyFat ? weight * (1 - bodyFat / 100) : undefined;
      const fatMass = bodyFat ? weight * (bodyFat / 100) : undefined;
      const height = m.height || 170;
      const bmi = weight > 0 ? weight / Math.pow(height / 100, 2) : undefined;

      return {
        date: format(m.measuredAt, 'yyyy-MM-dd'),
        weight,
        bodyFatPercentage: bodyFat || undefined,
        leanMass: leanMass ? Math.round(leanMass * 10) / 10 : undefined,
        fatMass: fatMass ? Math.round(fatMass * 10) / 10 : undefined,
        bmi: bmi ? Math.round(bmi * 10) / 10 : undefined,
      };
    });
  }

  async getProgressChartData(
    userId: string,
    metric: 'weight' | 'bodyFat' | 'measurements',
    days: number = 30
  ): Promise<{
    labels: string[];
    datasets: { label: string; data: number[]; color: string }[];
  }> {
    const startDate = subDays(new Date(), days);

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measuredAt: { gte: startDate },
      },
      orderBy: { measuredAt: 'asc' },
    });

    const labels = measurements.map(m => format(m.measuredAt, 'MMM d'));

    switch (metric) {
      case 'weight':
        return {
          labels,
          datasets: [
            {
              label: 'Weight (kg)',
              data: measurements.map(m => m.weight || 0),
              color: '#3B82F6',
            },
          ],
        };

      case 'bodyFat':
        return {
          labels,
          datasets: [
            {
              label: 'Body Fat %',
              data: measurements.map(m => m.bodyFatPercentage || 0),
              color: '#F59E0B',
            },
          ],
        };

      case 'measurements':
        const parsedMeasurements = measurements
          .filter(m => m.measurements)
          .map(m => {
            try {
              return JSON.parse(m.measurements);
            } catch {
              return {};
            }
          });

        return {
          labels: measurements
            .filter(m => m.measurements)
            .map(m => format(m.measuredAt, 'MMM d')),
          datasets: [
            {
              label: 'Chest',
              data: parsedMeasurements.map(m => m.chest || 0),
              color: '#3B82F6',
            },
            {
              label: 'Waist',
              data: parsedMeasurements.map(m => m.waist || 0),
              color: '#EF4444',
            },
            {
              label: 'Hips',
              data: parsedMeasurements.map(m => m.hips || 0),
              color: '#10B981',
            },
            {
              label: 'Biceps',
              data: parsedMeasurements.map(m => m.biceps || 0),
              color: '#8B5CF6',
            },
          ],
        };

      default:
        return { labels, datasets: [] };
    }
  }

  async deleteMeasurement(measurementId: string): Promise<void> {
    await prisma.bodyMeasurement.delete({ where: { id: measurementId } });
  }

  async getLatestMeasurements(userId: string): Promise<{
    weight?: number;
    height?: number;
    bodyFat?: number;
    measurements?: any;
  }> {
    const latest = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    if (!latest) return {};

    let parsedMeasurements;
    if (latest.measurements) {
      try {
        parsedMeasurements = JSON.parse(latest.measurements);
      } catch {}
    }

    return {
      weight: latest.weight || undefined,
      height: latest.height || undefined,
      bodyFat: latest.bodyFatPercentage || undefined,
      measurements: parsedMeasurements,
    };
  }
}

export const bodyService = new BodyService();