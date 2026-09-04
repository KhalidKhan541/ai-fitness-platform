import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, Exercise, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateExerciseInput {
  name: string;
  description: string;
  category: ExerciseCategory;
  muscleGroups: string[];
  equipment: Equipment[];
  difficulty: DifficultyLevel;
  instructions: string[];
  tips?: string[];
  videoUrl?: string;
  imageUrl?: string;
  isCustom?: boolean;
  alternatives?: string[];
}

export interface UpdateExerciseInput {
  name?: string;
  description?: string;
  category?: ExerciseCategory;
  muscleGroups?: string[];
  equipment?: Equipment[];
  difficulty?: DifficultyLevel;
  instructions?: string[];
  tips?: string[];
  videoUrl?: string;
  imageUrl?: string;
}

export type ExerciseCategory =
  | 'STRENGTH'
  | 'CARDIO'
  | 'FLEXIBILITY'
  | 'BALANCE'
  | 'PLYOMETRIC'
  | 'OLYMPIC'
  | 'ISOLATION'
  | 'COMPOUND'
  | 'BODYWEIGHT'
  | 'MACHINE'
  | 'CABLE'
  | 'FREEWEIGHT'
  | 'KETTLEBELL'
  | 'RESISTANCE_BAND'
  | 'MEDICINE_BALL'
  | 'SMITH_MACHINE'
  | 'LEVER_MACHINE'
  | 'PULLEY';

export type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'KETTLEBELL'
  | 'MACHINE'
  | 'CABLE'
  | 'SMITH_MACHINE'
  | 'LEVER_MACHINE'
  | 'PULLEY'
  | 'RESISTANCE_BAND'
  | 'MEDICINE_BALL'
  | 'STABILITY_BALL'
  | 'FOAM_ROLLER'
  | 'PULL_UP_BAR'
  | 'DIP_BAR'
  | 'BENCH'
  | 'INCLINE_BENCH'
  | 'DECLINE_BENCH'
  | 'RACK'
  | 'PLATFORM'
  | 'TREADMILL'
  | 'BIKE'
  | 'ROWING_MACHINE'
  | 'ELLIPTICAL'
  | 'JUMP_ROPE'
  | 'BATTLE_ROPE'
  | 'SLED'
  | 'YOGA_MAT'
  | 'BODYWEIGHT'
  | 'NONE';

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface ExerciseSearchFilters {
  query?: string;
  category?: ExerciseCategory;
  muscleGroup?: string;
  equipment?: Equipment[];
  difficulty?: DifficultyLevel;
  isCustom?: boolean;
}

export interface ExerciseStats {
  totalExercises: number;
  byCategory: { category: string; count: number }[];
  byMuscleGroup: { muscleGroup: string; count: number }[];
  byEquipment: { equipment: string; count: number }[];
}

export class ExerciseService {
  private readonly EXERCISE_DEFINITIONS: Omit<CreateExerciseInput, 'isCustom'>[] = [
    // CHEST EXERCISES
    {
      name: 'Barbell Bench Press',
      description: 'A compound chest exercise that primarily targets the pectoralis major, anterior deltoids, and triceps.',
      category: 'COMPOUND',
      muscleGroups: ['CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['BARBELL', 'BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Lie on a flat bench with feet on the floor',
        'Grip the barbell slightly wider than shoulder-width',
        'Unrack the bar and lower it to mid-chest',
        'Press the bar back up to full arm extension',
        'Keep your shoulder blades retracted throughout',
      ],
      tips: ['Keep your core tight', 'Don\'t bounce the bar off your chest', 'Use a spotter for heavy sets'],
      alternatives: ['Dumbbell Bench Press', 'Incline Barbell Press'],
    },
    {
      name: 'Incline Barbell Bench Press',
      description: 'An upper chest focused variation of the bench press using an inclined bench.',
      category: 'COMPOUND',
      muscleGroups: ['UPPER_CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['BARBELL', 'INCLINE_BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Set bench to 30-45 degree incline',
        'Lie back and grip the barbell slightly wider than shoulder-width',
        'Lower the bar to upper chest',
        'Press back up to full extension',
      ],
      tips: ['Focus on upper chest contraction', 'Don\'t use too steep of an angle'],
      alternatives: ['Incline Dumbbell Press', 'Smith Machine Incline Press'],
    },
    {
      name: 'Dumbbell Bench Press',
      description: 'A chest exercise using dumbbells that allows for greater range of motion than barbell.',
      category: 'COMPOUND',
      muscleGroups: ['CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['DUMBBELL', 'BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Lie on a flat bench holding a dumbbell in each hand',
        'Start with dumbbells at chest level, palms facing forward',
        'Press dumbbells up and slightly inward',
        'Lower back down to chest level with control',
      ],
      tips: ['Keep a neutral wrist position', 'Focus on the chest squeeze at the top'],
      alternatives: ['Barbell Bench Press', 'Incline Dumbbell Press'],
    },
    {
      name: 'Incline Dumbbell Press',
      description: 'Upper chest exercise using dumbbells on an inclined bench.',
      category: 'COMPOUND',
      muscleGroups: ['UPPER_CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['DUMBBELL', 'INCLINE_BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Set bench to 30-45 degree incline',
        'Hold dumbbells at chest level',
        'Press up until arms are extended',
        'Lower with control to starting position',
      ],
      tips: ['Keep elbows at 45-degree angle', 'Squeeze chest at the top'],
      alternatives: ['Incline Barbell Press', 'Smith Machine Incline Press'],
    },
    {
      name: 'Cable Crossover',
      description: 'An isolation exercise for the chest using cable machines.',
      category: 'ISOLATION',
      muscleGroups: ['CHEST'],
      equipment: ['CABLE'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand between two cable stations',
        'Grip handles with arms extended out to sides',
        'Bring hands together in front of chest',
        'Return to starting position with control',
      ],
      tips: ['Keep a slight bend in elbows', 'Focus on the squeeze at the center'],
      alternatives: ['Dumbbell Flyes', 'Pec Deck Machine'],
    },
    {
      name: 'Chest Flyes',
      description: 'An isolation exercise targeting the chest using dumbbells.',
      category: 'ISOLATION',
      muscleGroups: ['CHEST'],
      equipment: ['DUMBBELL', 'BENCH'],
      difficulty: 'BEGINNER',
      instructions: [
        'Lie on a flat bench holding dumbbells above chest',
        'Lower arms out to sides with slight elbow bend',
        'Bring dumbbells back together above chest',
        'Focus on chest contraction throughout',
      ],
      tips: ['Keep elbows slightly bent', 'Don\'t go too heavy'],
      alternatives: ['Cable Crossover', 'Pec Deck Machine'],
    },
    {
      name: 'Push Ups',
      description: 'A bodyweight compound exercise for chest, shoulders, and triceps.',
      category: 'BODYWEIGHT',
      muscleGroups: ['CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Start in plank position with hands slightly wider than shoulders',
        'Lower body until chest nearly touches floor',
        'Push back up to starting position',
        'Keep core tight throughout',
      ],
      tips: ['Keep body in straight line', 'Don\'t let hips sag or pike up'],
      alternatives: ['Diamond Push Ups', 'Incline Push Ups'],
    },
    {
      name: 'Diamond Push Ups',
      description: 'A push-up variation emphasizing triceps and inner chest.',
      category: 'BODYWEIGHT',
      muscleGroups: ['CHEST', 'TRICEPS'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Form diamond shape with hands under chest',
        'Perform push-up with elbows close to body',
        'Push back to starting position',
      ],
      tips: ['Keep elbows close to body', 'Focus on tricep engagement'],
      alternatives: ['Close Grip Bench Press', 'Tricep Dips'],
    },
    {
      name: 'Decline Bench Press',
      description: 'A chest exercise targeting the lower pectorals.',
      category: 'COMPOUND',
      muscleGroups: ['LOWER_CHEST', 'FRONT_DELTS', 'TRICEPS'],
      equipment: ['BARBELL', 'DECLINE_BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Secure feet on decline bench',
        'Grip barbell slightly wider than shoulders',
        'Lower bar to lower chest',
        'Press back up to full extension',
      ],
      tips: ['Have a spotter', 'Control the weight on the way down'],
      alternatives: ['Dumbbell Decline Press', 'Cable Flyes'],
    },

    // BACK EXERCISES
    {
      name: 'Barbell Row',
      description: 'A compound back exercise targeting the lats, rhomboids, and biceps.',
      category: 'COMPOUND',
      muscleGroups: ['LATS', 'RHOMBOIDS', 'BICEPS', 'REAR_DELTS'],
      equipment: ['BARBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Bend at hips with slight knee bend',
        'Grip barbell with overhand grip',
        'Pull bar to lower chest',
        'Lower with control to starting position',
      ],
      tips: ['Keep back straight', 'Drive elbows back, not up'],
      alternatives: ['Dumbbell Row', 'T-Bar Row'],
    },
    {
      name: 'Pull Ups',
      description: 'A bodyweight compound exercise primarily targeting the lats.',
      category: 'BODYWEIGHT',
      muscleGroups: ['LATS', 'BICEPS', 'RHOMBOIDS'],
      equipment: ['PULL_UP_BAR'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Hang from pull-up bar with overhand grip',
        'Pull body up until chin clears the bar',
        'Lower with control to full extension',
      ],
      tips: ['Full range of motion', 'Avoid swinging'],
      alternatives: ['Chin Ups', 'Lat Pulldown'],
    },
    {
      name: 'Lat Pulldown',
      description: 'A machine exercise targeting the lats, similar to pull-ups.',
      category: 'MACHINE',
      muscleGroups: ['LATS', 'BICEPS'],
      equipment: ['CABLE', 'PULLEY'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit at lat pulldown machine',
        'Grip bar slightly wider than shoulders',
        'Pull bar down to upper chest',
        'Return to starting position with control',
      ],
      tips: ['Lean back slightly', 'Focus on squeezing lats'],
      alternatives: ['Pull Ups', 'Seated Cable Row'],
    },
    {
      name: 'Seated Cable Row',
      description: 'A cable exercise for back thickness and biceps.',
      category: 'CABLE',
      muscleGroups: ['LATS', 'RHOMBOIDS', 'BICEPS'],
      equipment: ['CABLE', 'PULLEY'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit at cable row station',
        'Grip handle with both hands',
        'Pull handle to midsection',
        'Return to starting position',
      ],
      tips: ['Keep back straight', 'Squeeze shoulder blades together'],
      alternatives: ['Barbell Row', 'T-Bar Row'],
    },
    {
      name: 'Dumbbell Row',
      description: 'A unilateral back exercise using a dumbbell.',
      category: 'FREEWEIGHT',
      muscleGroups: ['LATS', 'RHOMBOIDS', 'BICEPS'],
      equipment: ['DUMBBELL', 'BENCH'],
      difficulty: 'BEGINNER',
      instructions: [
        'Place one knee and hand on bench',
        'Hold dumbbell in opposite hand',
        'Pull dumbbell to hip',
        'Lower with control',
      ],
      tips: ['Keep back flat', 'Drive elbow back'],
      alternatives: ['Barbell Row', 'Cable Row'],
    },
    {
      name: 'Deadlift',
      description: 'A compound exercise targeting the entire posterior chain.',
      category: 'COMPOUND',
      muscleGroups: ['HAMSTRINGS', 'GLUTES', 'LOWER_BACK', 'LATS'],
      equipment: ['BARBELL'],
      difficulty: 'ADVANCED',
      instructions: [
        'Stand with feet hip-width apart',
        'Grip barbell with overhand or mixed grip',
        'Drive through heels, keeping back straight',
        'Lock out hips and knees at top',
        'Lower with control to floor',
      ],
      tips: ['Keep bar close to body', 'Brace core throughout'],
      alternatives: ['Romanian Deadlift', 'Trap Bar Deadlift'],
    },
    {
      name: 'T-Bar Row',
      description: 'A compound back exercise using a T-bar row machine.',
      category: 'COMPOUND',
      muscleGroups: ['LATS', 'RHOMBOIDS', 'BICEPS', 'LOWER_BACK'],
      equipment: ['BARBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Straddle T-bar with feet shoulder-width apart',
        'Grip handles with both hands',
        'Pull weight to chest',
        'Lower with control',
      ],
      tips: ['Keep back straight', 'Don\'t use momentum'],
      alternatives: ['Barbell Row', 'Seated Cable Row'],
    },
    {
      name: 'Chin Ups',
      description: 'A bodyweight exercise targeting biceps and lats with underhand grip.',
      category: 'BODYWEIGHT',
      muscleGroups: ['LATS', 'BICEPS'],
      equipment: ['PULL_UP_BAR'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Hang from bar with underhand grip',
        'Pull body up until chin clears bar',
        'Lower with control',
      ],
      tips: ['Full range of motion', 'Focus on bicep engagement'],
      alternatives: ['Pull Ups', 'Lat Pulldown'],
    },

    // SHOULDER EXERCISES
    {
      name: 'Overhead Press',
      description: 'A compound shoulder exercise using a barbell.',
      category: 'COMPOUND',
      muscleGroups: ['FRONT_DELTS', 'SIDE_DELTS', 'TRICEPS'],
      equipment: ['BARBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand with feet shoulder-width apart',
        'Grip barbell at shoulder level',
        'Press bar overhead to full extension',
        'Lower back to starting position',
      ],
      tips: ['Brace core throughout', 'Don\'t arch back excessively'],
      alternatives: ['Dumbbell Shoulder Press', 'Military Press'],
    },
    {
      name: 'Dumbbell Shoulder Press',
      description: 'A shoulder exercise using dumbbells for balanced development.',
      category: 'FREEWEIGHT',
      muscleGroups: ['FRONT_DELTS', 'SIDE_DELTS', 'TRICEPS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit or stand holding dumbbells at shoulder level',
        'Press dumbbells overhead until arms extended',
        'Lower back to starting position',
      ],
      tips: ['Keep core tight', 'Don\'t arch back'],
      alternatives: ['Overhead Press', 'Arnold Press'],
    },
    {
      name: 'Lateral Raises',
      description: 'An isolation exercise for the lateral deltoids.',
      category: 'ISOLATION',
      muscleGroups: ['SIDE_DELTS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding dumbbells at sides',
        'Raise arms out to sides until parallel to floor',
        'Lower with control',
      ],
      tips: ['Keep slight bend in elbows', 'Don\'t swing weight'],
      alternatives: ['Cable Lateral Raises', 'Machine Lateral Raises'],
    },
    {
      name: 'Front Raises',
      description: 'An isolation exercise for the anterior deltoids.',
      category: 'ISOLATION',
      muscleGroups: ['FRONT_DELTS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding dumbbells in front of thighs',
        'Raise one arm forward until parallel to floor',
        'Lower and alternate arms',
      ],
      tips: ['Don\'t swing', 'Keep core engaged'],
      alternatives: ['Cable Front Raises', 'Plate Front Raises'],
    },
    {
      name: 'Rear Delt Flyes',
      description: 'An isolation exercise for the posterior deltoids.',
      category: 'ISOLATION',
      muscleGroups: ['REAR_DELTS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Bend at hips with dumbbells hanging',
        'Raise arms out to sides',
        'Squeeze shoulder blades at top',
        'Lower with control',
      ],
      tips: ['Keep slight bend in elbows', 'Focus on rear delts'],
      alternatives: ['Face Pulls', 'Reverse Pec Deck'],
    },
    {
      name: 'Face Pulls',
      description: 'A cable exercise for rear delts and rotator cuff.',
      category: 'CABLE',
      muscleGroups: ['REAR_DELTS', 'RHOMBOIDS'],
      equipment: ['CABLE', 'PULLEY'],
      difficulty: 'BEGINNER',
      instructions: [
        'Set cable at face height',
        'Pull rope to face with elbows high',
        'Squeeze shoulder blades together',
        'Return to starting position',
      ],
      tips: ['Keep elbows high', 'Focus on rear delt contraction'],
      alternatives: ['Rear Delt Flyes', 'Band Pull Aparts'],
    },
    {
      name: 'Arnold Press',
      description: 'A shoulder exercise combining front and lateral raises.',
      category: 'FREEWEIGHT',
      muscleGroups: ['FRONT_DELTS', 'SIDE_DELTS', 'TRICEPS'],
      equipment: ['DUMBBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Start with dumbbells in front of face, palms facing you',
        'Press up while rotating palms outward',
        'Lower while rotating palms back',
      ],
      tips: ['Control the rotation', 'Full range of motion'],
      alternatives: ['Dumbbell Shoulder Press', 'Overhead Press'],
    },

    // LEG EXERCISES
    {
      name: 'Barbell Squat',
      description: 'A compound leg exercise targeting quads, glutes, and hamstrings.',
      category: 'COMPOUND',
      muscleGroups: ['QUADS', 'GLUTES', 'HAMSTRINGS', 'LOWER_BACK'],
      equipment: ['BARBELL', 'RACK'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Position bar on upper back',
        'Stand with feet shoulder-width apart',
        'Descend until thighs parallel to floor',
        'Drive through heels to standing position',
      ],
      tips: ['Keep chest up', 'Push knees out over toes'],
      alternatives: ['Front Squat', 'Goblet Squat'],
    },
    {
      name: 'Front Squat',
      description: 'A quad-dominant squat variation with barbell in front rack position.',
      category: 'COMPOUND',
      muscleGroups: ['QUADS', 'GLUTES', 'CORE'],
      equipment: ['BARBELL', 'RACK'],
      difficulty: 'ADVANCED',
      instructions: [
        'Position bar across front delts',
        'Keep elbows high throughout',
        'Descend to full depth',
        'Drive up through heels',
      ],
      tips: ['Maintain upright torso', 'High elbow position'],
      alternatives: ['Back Squat', 'Goblet Squat'],
    },
    {
      name: 'Leg Press',
      description: 'A machine exercise for quads, glutes, and hamstrings.',
      category: 'MACHINE',
      muscleGroups: ['QUADS', 'GLUTES', 'HAMSTRINGS'],
      equipment: ['MACHINE'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit in leg press machine',
        'Place feet shoulder-width on platform',
        'Lower platform toward chest',
        'Press back to starting position',
      ],
      tips: ['Don\'t lock knees', 'Control the negative'],
      alternatives: ['Squat', 'Hack Squat'],
    },
    {
      name: 'Romanian Deadlift',
      description: 'A hip-hinge exercise targeting hamstrings and glutes.',
      category: 'COMPOUND',
      muscleGroups: ['HAMSTRINGS', 'GLUTES', 'LOWER_BACK'],
      equipment: ['BARBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand with feet hip-width apart',
        'Hold barbell with overhand grip',
        'Hinge at hips, pushing them back',
        'Lower bar along legs until stretch felt',
        'Drive hips forward to return',
      ],
      tips: ['Keep back straight', 'Slight knee bend'],
      alternatives: ['Stiff Leg Deadlift', 'Good Mornings'],
    },
    {
      name: 'Leg Curl',
      description: 'An isolation exercise for the hamstrings.',
      category: 'MACHINE',
      muscleGroups: ['HAMSTRINGS'],
      equipment: ['MACHINE'],
      difficulty: 'BEGINNER',
      instructions: [
        'Lie face down on leg curl machine',
        'Position pad behind ankles',
        'Curl legs toward glutes',
        'Lower with control',
      ],
      tips: ['Don\'t lift hips', 'Full range of motion'],
      alternatives: ['Nordic Curls', 'Swiss Ball Hamstring Curl'],
    },
    {
      name: 'Leg Extension',
      description: 'An isolation exercise for the quadriceps.',
      category: 'MACHINE',
      muscleGroups: ['QUADS'],
      equipment: ['MACHINE'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit in leg extension machine',
        'Position pad on lower shins',
        'Extend legs until straight',
        'Lower with control',
      ],
      tips: ['Don\'t lock knees violently', 'Squeeze quads at top'],
      alternatives: ['Wall Sits', 'Bodyweight Squats'],
    },
    {
      name: 'Bulgarian Split Squat',
      description: 'A unilateral leg exercise using a bench for rear foot elevation.',
      category: 'FREEWEIGHT',
      muscleGroups: ['QUADS', 'GLUTES', 'HAMSTRINGS'],
      equipment: ['DUMBBELL', 'BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand facing away from bench',
        'Place rear foot on bench',
        'Lower body until front thigh parallel to floor',
        'Drive back up to starting position',
      ],
      tips: ['Keep torso upright', 'Front knee tracks over toes'],
      alternatives: ['Lunges', 'Step Ups'],
    },
    {
      name: 'Calf Raises',
      description: 'An isolation exercise for the calf muscles.',
      category: 'ISOLATION',
      muscleGroups: ['CALVES'],
      equipment: ['MACHINE'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand on calf raise machine',
        'Position shoulders under pads',
        'Rise up on toes',
        'Lower heels below platform',
      ],
      tips: ['Full range of motion', 'Pause at top and bottom'],
      alternatives: ['Standing Calf Raises', 'Seated Calf Raises'],
    },
    {
      name: 'Walking Lunges',
      description: 'A dynamic leg exercise targeting quads, glutes, and hamstrings.',
      category: 'FREEWEIGHT',
      muscleGroups: ['QUADS', 'GLUTES', 'HAMSTRINGS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding dumbbells at sides',
        'Step forward into lunge',
        'Lower back knee toward floor',
        'Push off front foot to step forward',
      ],
      tips: ['Keep torso upright', 'Long stride for glutes'],
      alternatives: ['Stationary Lunges', 'Bulgarian Split Squat'],
    },
    {
      name: 'Hack Squat',
      description: 'A machine squat variation targeting the quads.',
      category: 'MACHINE',
      muscleGroups: ['QUADS', 'GLUTES'],
      equipment: ['MACHINE'],
      difficulty: 'BEGINNER',
      instructions: [
        'Position shoulders under pads',
        'Place feet shoulder-width on platform',
        'Lower until thighs parallel',
        'Press back up to starting position',
      ],
      tips: ['Keep back against pad', 'Don\'t lock knees'],
      alternatives: ['Barbell Squat', 'Leg Press'],
    },

    // ARM EXERCISES
    {
      name: 'Barbell Curl',
      description: 'A compound bicep exercise using a barbell.',
      category: 'ISOLATION',
      muscleGroups: ['BICEPS'],
      equipment: ['BARBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding barbell with underhand grip',
        'Curl bar toward shoulders',
        'Lower with control to full extension',
      ],
      tips: ['Keep elbows at sides', 'Don\'t swing body'],
      alternatives: ['Dumbbell Curl', 'EZ Bar Curl'],
    },
    {
      name: 'Dumbbell Curl',
      description: 'A bicep exercise using dumbbells for balanced development.',
      category: 'FREEWEIGHT',
      muscleGroups: ['BICEPS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding dumbbells at sides',
        'Curl one dumbbell toward shoulder',
        'Lower and alternate arms',
      ],
      tips: ['Keep elbow stationary', 'Control the movement'],
      alternatives: ['Barbell Curl', 'Hammer Curl'],
    },
    {
      name: 'Hammer Curl',
      description: 'A bicep exercise emphasizing the brachialis and brachioradialis.',
      category: 'FREEWEIGHT',
      muscleGroups: ['BICEPS', 'FOREARMS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand holding dumbbells with neutral grip',
        'Curl dumbbells toward shoulders',
        'Lower with control',
      ],
      tips: ['Keep elbows at sides', 'Neutral grip throughout'],
      alternatives: ['Barbell Curl', 'Reverse Curl'],
    },
    {
      name: 'Tricep Pushdown',
      description: 'A cable exercise isolating the triceps.',
      category: 'CABLE',
      muscleGroups: ['TRICEPS'],
      equipment: ['CABLE', 'PULLEY'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand at cable station with rope or bar',
        'Push weight down until arms extended',
        'Return to starting position',
      ],
      tips: ['Keep elbows at sides', 'Full lockout at bottom'],
      alternatives: ['Overhead Tricep Extension', 'Skull Crushers'],
    },
    {
      name: 'Skull Crushers',
      description: 'A tricep exercise using an EZ bar or dumbbells.',
      category: 'FREEWEIGHT',
      muscleGroups: ['TRICEPS'],
      equipment: ['BARBELL', 'BENCH'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Lie on bench holding bar above forehead',
        'Lower bar toward forehead by bending elbows',
        'Extend arms back to starting position',
      ],
      tips: ['Keep elbows pointed up', 'Control the negative'],
      alternatives: ['Tricep Pushdown', 'Overhead Extension'],
    },
    {
      name: 'Overhead Tricep Extension',
      description: 'A tricep exercise emphasizing the long head.',
      category: 'FREEWEIGHT',
      muscleGroups: ['TRICEPS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Hold dumbbell overhead with both hands',
        'Lower behind head by bending elbows',
        'Extend arms back overhead',
      ],
      tips: ['Keep elbows close to head', 'Full range of motion'],
      alternatives: ['Skull Crushers', 'Tricep Kickbacks'],
    },
    {
      name: 'Tricep Dips',
      description: 'A bodyweight exercise targeting triceps and chest.',
      category: 'BODYWEIGHT',
      muscleGroups: ['TRICEPS', 'CHEST', 'FRONT_DELTS'],
      equipment: ['DIP_BAR'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Support body on parallel bars',
        'Lower body by bending elbows',
        'Push back up to starting position',
      ],
      tips: ['Keep torso upright for triceps', 'Don\'t go too deep'],
      alternatives: ['Bench Dips', 'Close Grip Bench Press'],
    },
    {
      name: 'Concentration Curl',
      description: 'A bicep isolation exercise performed seated.',
      category: 'FREEWEIGHT',
      muscleGroups: ['BICEPS'],
      equipment: ['DUMBBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit on bench, lean forward',
        'Hold dumbbell with arm against inner thigh',
        'Curl dumbbell toward shoulder',
        'Lower with control',
      ],
      tips: ['Full contraction at top', 'Don\'t swing weight'],
      alternatives: ['Dumbbell Curl', 'Preacher Curl'],
    },
    {
      name: 'Preacher Curl',
      description: 'A bicep exercise using a preacher bench for support.',
      category: 'FREEWEIGHT',
      muscleGroups: ['BICEPS'],
      equipment: ['BARBELL', 'BENCH'],
      difficulty: 'BEGINNER',
      instructions: [
        'Position arms on preacher bench',
        'Curl bar toward shoulders',
        'Lower with control to full extension',
      ],
      tips: ['Don\'t swing body', 'Full range of motion'],
      alternatives: ['Dumbbell Curl', 'Machine Preacher Curl'],
    },

    // CORE EXERCISES
    {
      name: 'Plank',
      description: 'An isometric core exercise for overall core stability.',
      category: 'BODYWEIGHT',
      muscleGroups: ['ABS', 'OBLIQUES', 'LOWER_BACK'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Start in forearm plank position',
        'Keep body in straight line',
        'Hold position for time',
      ],
      tips: ['Don\'t let hips sag', 'Keep core tight'],
      alternatives: ['Side Plank', 'Dead Bug'],
    },
    {
      name: 'Crunches',
      description: 'A core exercise targeting the rectus abdominis.',
      category: 'BODYWEIGHT',
      muscleGroups: ['ABS'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Lie on back with knees bent',
        'Place hands behind head or across chest',
        'Curl shoulders off floor',
        'Lower with control',
      ],
      tips: ['Don\'t pull on neck', 'Focus on abs, not momentum'],
      alternatives: ['Cable Crunches', 'Hanging Leg Raises'],
    },
    {
      name: 'Russian Twists',
      description: 'A rotational core exercise for obliques.',
      category: 'BODYWEIGHT',
      muscleGroups: ['OBLIQUES', 'ABS'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Sit with knees bent, feet off floor',
        'Lean back slightly',
        'Rotate torso side to side',
      ],
      tips: ['Keep core tight', 'Control the rotation'],
      alternatives: ['Wood Chops', 'Side Bends'],
    },
    {
      name: 'Hanging Leg Raises',
      description: 'An advanced core exercise for lower abs.',
      category: 'BODYWEIGHT',
      muscleGroups: ['ABS', 'HIP_FLEXORS'],
      equipment: ['PULL_UP_BAR'],
      difficulty: 'ADVANCED',
      instructions: [
        'Hang from pull-up bar',
        'Raise legs to parallel or higher',
        'Lower with control',
      ],
      tips: ['Don\'t swing', 'Full range of motion'],
      alternatives: ['Lying Leg Raises', 'Captain\'s Chair Leg Raises'],
    },
    {
      name: 'Dead Bug',
      description: 'A core stability exercise for coordination and anti-extension.',
      category: 'BODYWEIGHT',
      muscleGroups: ['ABS', 'OBLIQUES'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Lie on back with arms extended to ceiling',
        'Raise legs to tabletop position',
        'Lower opposite arm and leg simultaneously',
        'Return and repeat on other side',
      ],
      tips: ['Keep lower back pressed to floor', 'Move slowly and controlled'],
      alternatives: ['Bird Dog', 'Plank'],
    },
    {
      name: 'Ab Wheel Rollout',
      description: 'An advanced core exercise for total core strength.',
      category: 'BODYWEIGHT',
      muscleGroups: ['ABS', 'OBLIQUES', 'LOWER_BACK'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'ADVANCED',
      instructions: [
        'Kneel with hands on ab wheel',
        'Roll forward until arms extended',
        'Pull back to starting position',
      ],
      tips: ['Keep core tight throughout', 'Don\'t arch lower back'],
      alternatives: ['Plank', 'Stability Ball Rollout'],
    },

    // CARDIO EXERCISES
    {
      name: 'Jumping Jacks',
      description: 'A bodyweight cardio exercise for full-body conditioning.',
      category: 'CARDIO',
      muscleGroups: ['FULL_BODY'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Stand with feet together, arms at sides',
        'Jump while spreading legs and raising arms overhead',
        'Jump back to starting position',
        'Repeat rhythmically',
      ],
      tips: ['Land softly', 'Keep a steady pace'],
      alternatives: ['High Knees', 'Butt Kicks'],
    },
    {
      name: 'Burpees',
      description: 'A high-intensity full-body exercise combining squat, plank, and jump.',
      category: 'HIIT',
      muscleGroups: ['FULL_BODY'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Start standing',
        'Drop to squat and place hands on floor',
        'Jump feet back to plank',
        'Perform push-up (optional)',
        'Jump feet to hands',
        'Explosively jump up with arms overhead',
      ],
      tips: ['Move quickly but with control', 'Modify as needed'],
      alternatives: ['Squat Thrusts', 'Mountain Climbers'],
    },
    {
      name: 'Mountain Climbers',
      description: 'A dynamic core and cardio exercise.',
      category: 'HIIT',
      muscleGroups: ['ABS', 'QUADS', 'SHOULDERS'],
      equipment: ['BODYWEIGHT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Start in plank position',
        'Drive one knee toward chest',
        'Quickly switch legs',
        'Continue alternating rapidly',
      ],
      tips: ['Keep hips low', 'Maintain plank position'],
      alternatives: ['High Knees', 'Burpees'],
    },
    {
      name: 'Box Jumps',
      description: 'A plyometric exercise for explosive power.',
      category: 'PLYOMETRIC',
      muscleGroups: ['QUADS', 'GLUTES', 'CALVES'],
      equipment: ['PLATFORM'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand facing box',
        'Swing arms and jump onto box',
        'Land softly with knees bent',
        'Step or jump down',
      ],
      tips: ['Land softly', 'Start with lower box height'],
      alternatives: ['Jump Squats', 'Bounding'],
    },
    {
      name: 'Battle Ropes',
      description: 'A high-intensity conditioning exercise using heavy ropes.',
      category: 'HIIT',
      muscleGroups: ['SHOULDERS', 'ARMS', 'CORE'],
      equipment: ['BATTLE_ROPE'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Hold rope ends with neutral grip',
        'Create waves by alternating arms',
        'Vary patterns (alternating, simultaneous, circles)',
      ],
      tips: ['Keep core engaged', 'Vary intensity and patterns'],
      alternatives: ['Sledgehammer Swings', 'Kettlebell Swings'],
    },

    // OLYMPIC LIFTS
    {
      name: 'Clean and Jerk',
      description: 'An Olympic lift combining a clean and overhead press.',
      category: 'OLYMPIC',
      muscleGroups: ['FULL_BODY'],
      equipment: ['BARBELL', 'PLATFORM'],
      difficulty: 'EXPERT',
      instructions: [
        'Start with barbell on floor',
        'Pull bar explosively to shoulders (clean)',
        'Dip and drive bar overhead (jerk)',
        'Lock out arms and stand tall',
      ],
      tips: ['Master each component separately first', 'Use proper form over weight'],
      alternatives: ['Power Clean', 'Push Press'],
    },
    {
      name: 'Snatch',
      description: 'An Olympic lift moving barbell from floor to overhead in one motion.',
      category: 'OLYMPIC',
      muscleGroups: ['FULL_BODY'],
      equipment: ['BARBELL', 'PLATFORM'],
      difficulty: 'EXPERT',
      instructions: [
        'Start with barbell on floor',
        'Pull bar explosively overhead in one motion',
        'Catch in overhead squat position',
        'Stand up to complete lift',
      ],
      tips: ['Master overhead mobility first', 'Use PVC pipe to practice'],
      alternatives: ['Power Snatch', 'Hang Snatch'],
    },
    {
      name: 'Power Clean',
      description: 'An Olympic lift pulling barbell from floor to shoulders.',
      category: 'OLYMPIC',
      muscleGroups: ['FULL_BODY'],
      equipment: ['BARBELL', 'PLATFORM'],
      difficulty: 'ADVANCED',
      instructions: [
        'Start with barbell on floor',
        'Pull bar explosively to shoulders',
        'Catch in front rack position',
        'Stand up to complete',
      ],
      tips: ['Use hip drive, not arms', 'Keep bar close to body'],
      alternatives: ['Clean and Jerk', 'Hang Clean'],
    },

    // KETTLEBELL EXERCISES
    {
      name: 'Kettlebell Swing',
      description: 'A dynamic exercise targeting posterior chain and cardiovascular endurance.',
      category: 'KETTLEBELL',
      muscleGroups: ['GLUTES', 'HAMSTRINGS', 'CORE', 'SHOULDERS'],
      equipment: ['KETTLEBELL'],
      difficulty: 'INTERMEDIATE',
      instructions: [
        'Stand with feet wider than shoulder-width',
        'Hold kettlebell with both hands',
        'Hinge at hips to swing kettlebell between legs',
        'Drive hips forward to swing kettlebell to eye level',
      ],
      tips: ['Power comes from hips, not arms', 'Keep back straight'],
      alternatives: ['Dumbbell Swing', 'Russian Kettlebell Swing'],
    },
    {
      name: 'Kettlebell Goblet Squat',
      description: 'A squat variation using a kettlebell for front loading.',
      category: 'KETTLEBELL',
      muscleGroups: ['QUADS', 'GLUTES', 'CORE'],
      equipment: ['KETTLEBELL'],
      difficulty: 'BEGINNER',
      instructions: [
        'Hold kettlebell at chest with both hands',
        'Squat down until thighs parallel',
        'Drive back up to standing',
      ],
      tips: ['Keep elbows inside knees', 'Maintain upright torso'],
      alternatives: ['Barbell Front Squat', 'Bodyweight Squat'],
    },
    {
      name: 'Turkish Get Up',
      description: 'A complex full-body exercise involving standing up from floor.',
      category: 'KETTLEBELL',
      muscleGroups: ['FULL_BODY'],
      equipment: ['KETTLEBELL'],
      difficulty: 'ADVANCED',
      instructions: [
        'Lie on floor with kettlebell pressed up',
        'Roll to side and post on hand',
        'Come to half-kneeling position',
        'Stand up fully',
        'Reverse movement to return to floor',
      ],
      tips: ['Master each step separately', 'Keep eyes on kettlebell'],
      alternatives: ['Floor Press', 'Half Get Up'],
    },

    // FLEXIBILITY EXERCISES
    {
      name: 'Yoga Sun Salutation',
      description: 'A flowing yoga sequence for flexibility and mindfulness.',
      category: 'FLEXIBILITY',
      muscleGroups: ['FULL_BODY'],
      equipment: ['YOGA_MAT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Start in Mountain Pose',
        'Flow through forward fold, plank, cobra',
        'Move to Downward Dog',
        'Return to standing',
      ],
      tips: ['Match breath to movement', 'Flow smoothly between poses'],
      alternatives: ['Cat-Cow Stretch', 'Child\'s Pose'],
    },
    {
      name: 'Foam Rolling',
      description: 'Self-myofascial release technique for muscle recovery.',
      category: 'FLEXIBILITY',
      muscleGroups: ['FULL_BODY'],
      equipment: ['FOAM_ROLLER'],
      difficulty: 'BEGINNER',
      instructions: [
        'Lie on foam roller targeting muscle',
        'Roll slowly back and forth',
        'Pause on tender spots for 20-30 seconds',
      ],
      tips: ['Roll slowly', 'Don\'t roll over joints'],
      alternatives: ['Lacrosse Ball Release', 'Massage Gun'],
    },
    {
      name: 'Hip Flexor Stretch',
      description: 'A stretch targeting the hip flexor muscles.',
      category: 'FLEXIBILITY',
      muscleGroups: ['HIP_FLEXORS', 'QUADS'],
      equipment: ['YOGA_MAT'],
      difficulty: 'BEGINNER',
      instructions: [
        'Kneel in half-kneeling position',
        'Push hips forward gently',
        'Hold stretch for 30 seconds',
        'Repeat on other side',
      ],
      tips: ['Keep torso upright', 'Don\'t arch lower back'],
      alternatives: ['Couch Stretch', 'Pigeon Pose'],
    },
  ];

  async initializeExerciseDatabase(): Promise<void> {
    const count = await prisma.exercise.count();
    if (count > 0) return;

    const exercises = this.EXERCISE_DEFINITIONS.map(def => ({
      id: uuidv4(),
      ...def,
      muscleGroups: JSON.stringify(def.muscleGroups),
      equipment: JSON.stringify(def.equipment),
      instructions: JSON.stringify(def.instructions),
      tips: def.tips ? JSON.stringify(def.tips) : undefined,
      alternatives: def.alternatives ? JSON.stringify(def.alternatives) : undefined,
      isCustom: false,
      createdBy: 'SYSTEM',
    }));

    await prisma.exercise.createMany({ data: exercises });
  }

  async searchExercises(filters: ExerciseSearchFilters): Promise<Exercise[]> {
    const where: Prisma.ExerciseWhereInput = {};

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.muscleGroup) {
      where.muscleGroups = { contains: filters.muscleGroup };
    }

    if (filters.equipment && filters.equipment.length > 0) {
      where.OR = filters.equipment.map(eq => ({
        equipment: { contains: eq },
      }));
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.isCustom !== undefined) {
      where.isCustom = filters.isCustom;
    }

    return prisma.exercise.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]> {
    return prisma.exercise.findMany({
      where: {
        muscleGroups: { contains: muscleGroup },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getExercisesByEquipment(equipment: Equipment): Promise<Exercise[]> {
    return prisma.exercise.findMany({
      where: {
        equipment: { contains: equipment },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getExercisesByCategory(category: ExerciseCategory): Promise<Exercise[]> {
    return prisma.exercise.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async getExercise(exerciseId: string): Promise<Exercise | null> {
    return prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
  }

  async createCustomExercise(userId: string, input: CreateExerciseInput): Promise<Exercise> {
    return prisma.exercise.create({
      data: {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        category: input.category,
        muscleGroups: JSON.stringify(input.muscleGroups),
        equipment: JSON.stringify(input.equipment),
        difficulty: input.difficulty,
        instructions: JSON.stringify(input.instructions),
        tips: input.tips ? JSON.stringify(input.tips) : undefined,
        videoUrl: input.videoUrl,
        imageUrl: input.imageUrl,
        isCustom: true,
        createdBy: userId,
        alternatives: input.alternatives ? JSON.stringify(input.alternatives) : undefined,
      },
    });
  }

  async updateExercise(exerciseId: string, input: UpdateExerciseInput): Promise<Exercise> {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new Error('Exercise not found');

    return prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...input,
        muscleGroups: input.muscleGroups ? JSON.stringify(input.muscleGroups) : undefined,
        equipment: input.equipment ? JSON.stringify(input.equipment) : undefined,
        instructions: input.instructions ? JSON.stringify(input.instructions) : undefined,
        tips: input.tips ? JSON.stringify(input.tips) : undefined,
      },
    });
  }

  async deleteExercise(exerciseId: string): Promise<void> {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new Error('Exercise not found');
    if (!exercise.isCustom) throw new Error('Cannot delete system exercises');

    await prisma.exercise.delete({ where: { id: exerciseId } });
  }

  async getExerciseStats(): Promise<ExerciseStats> {
    const totalExercises = await prisma.exercise.count();

    const exercises = await prisma.exercise.findMany({
      select: {
        category: true,
        muscleGroups: true,
        equipment: true,
      },
    });

    const byCategory = this.countByField(exercises, 'category');
    const byMuscleGroup = this.countByJsonField(exercises, 'muscleGroups');
    const byEquipment = this.countByJsonField(exercises, 'equipment');

    return {
      totalExercises,
      byCategory,
      byMuscleGroup,
      byEquipment,
    };
  }

  private countByField(items: any[], field: string): { [key: string]: number }[] {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const value = item[field];
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ [field]: key, count }))
      .sort((a, b) => b.count - a.count);
  }

  private countByJsonField(items: any[], field: string): { [key: string]: number }[] {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      try {
        const values = JSON.parse(item[field]);
        values.forEach((value: string) => {
          counts[value] = (counts[value] || 0) + 1;
        });
      } catch {}
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ muscleGroup: key, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getExerciseInstructions(exerciseId: string): Promise<string[]> {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new Error('Exercise not found');

    return JSON.parse(exercise.instructions);
  }

  async getExerciseTips(exerciseId: string): Promise<string[]> {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new Error('Exercise not found');

    return exercise.tips ? JSON.parse(exercise.tips) : [];
  }

  async getAlternativeExercises(exerciseId: string): Promise<Exercise[]> {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new Error('Exercise not found');

    const alternatives = exercise.alternatives ? JSON.parse(exercise.alternatives) : [];
    if (alternatives.length === 0) return [];

    return prisma.exercise.findMany({
      where: {
        name: { in: alternatives },
      },
    });
  }

  async getMuscleGroups(): Promise<string[]> {
    const exercises = await prisma.exercise.findMany({
      select: { muscleGroups: true },
    });

    const muscleGroups = new Set<string>();
    exercises.forEach(ex => {
      try {
        JSON.parse(ex.muscleGroups).forEach((mg: string) => muscleGroups.add(mg));
      } catch {}
    });

    return Array.from(muscleGroups).sort();
  }

  async getEquipmentTypes(): Promise<string[]> {
    const exercises = await prisma.exercise.findMany({
      select: { equipment: true },
    });

    const equipment = new Set<string>();
    exercises.forEach(ex => {
      try {
        JSON.parse(ex.equipment).forEach((eq: string) => equipment.add(eq));
      } catch {}
    });

    return Array.from(equipment).sort();
  }
}

export const exerciseService = new ExerciseService();