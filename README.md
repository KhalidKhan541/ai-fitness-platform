# AI-Powered Fitness & Health Platform

An intelligent fitness platform combining workout tracking, nutrition planning, AI coaching, and social features — like having MyFitnessPal, Strava, and a personal trainer in one app.

## Features

- **Workout Tracking** — Log exercises, track sets/reps/weight, monitor progress
- **AI Workout Generator** — Personalized workout plans based on your goals, level, and available equipment
- **Nutrition Tracking** — Log meals, track macros, scan barcodes
- **AI Nutrition Advisor** — Personalized meal plans, calorie/macro recommendations
- **Progress Analytics** — Weight charts, body measurements, trend analysis
- **Goal Setting** — Weight loss, strength, endurance goals with milestone tracking
- **Social Feed** — Share workouts, react, comment, follow other users
- **Challenges** — Join community challenges, compete on leaderboards
- **AI Coach Chat** — Real-time chat with an AI fitness coach
- **Premium Subscription** — Stripe-powered subscription tiers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Recharts, Zustand |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL, Redis |
| AI | OpenAI API |
| Auth | NextAuth.js |
| Payments | Stripe |
| Testing | Jest, React Testing Library |
| CI/CD | GitHub Actions |
| Docker | Multi-stage builds, docker-compose |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-fitness-platform.git
cd ai-fitness-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Docker

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format code with Prettier
npm run typecheck     # TypeScript type checking
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

## Project Structure

```
ai-fitness-platform/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── (auth)/       # Auth pages (login, register)
│   │   ├── dashboard/    # Main dashboard
│   │   ├── workouts/     # Workout pages
│   │   ├── nutrition/    # Nutrition pages
│   │   ├── progress/     # Progress tracking
│   │   ├── goals/        # Goal management
│   │   ├── challenges/   # Challenge pages
│   │   └── social/       # Social feed
│   ├── components/       # React components
│   ├── lib/              # Utilities & services
│   │   ├── ai/           # AI services (workout generator, nutrition advisor)
│   │   ├── workouts/     # Workout services
│   │   ├── nutrition/    # Nutrition services
│   │   ├── goals/        # Goal services
│   │   ├── challenges/   # Challenge services
│   │   ├── social/       # Social services
│   │   └── validators.ts # Zod validators
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── prisma/               # Prisma schema & migrations
├── public/               # Static assets
├── .github/workflows/    # CI/CD pipelines
└── docker/               # Docker configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/workouts` | List/create workouts |
| GET/PUT/DELETE | `/api/workouts/[id]` | Workout CRUD |
| GET/POST | `/api/nutrition` | Nutrition logs |
| GET/POST | `/api/goals` | Goal management |
| GET/POST | `/api/challenges` | Challenges |
| GET/POST | `/api/social/feed` | Social feed |
| POST | `/api/ai/workout` | Generate AI workout |
| POST | `/api/ai/nutrition` | AI nutrition advice |
| POST | `/api/ai/chat` | AI coach chat |

## Testing

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- workouts/workout-service.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

- **Unit Tests**: Services, validators, permissions
- **Component Tests**: UI components with React Testing Library
- **Integration Tests**: API routes with mocked dependencies

## Environment Variables

See [`.env.example`](.env.example) for all required environment variables.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](LICENSE) for details.
