# Contributing to AI Fitness Platform

Thank you for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Run tests: `npm run test`
7. Run linting: `npm run lint`
8. Commit your changes
9. Push to your fork and submit a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Start dev server
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Use Prettier for formatting (auto-formats on save)
- Use ESLint for linting
- Write meaningful variable and function names
- Add types for all function parameters and return values

### Component Guidelines

- Use functional components with hooks
- Keep components under 200 lines
- Extract reusable logic into custom hooks
- Use proper prop types with TypeScript interfaces
- Test components with React Testing Library

### Service Guidelines

- Services should be pure functions when possible
- Use dependency injection for external services
- Handle errors gracefully with proper error messages
- Add JSDoc comments for public methods
- Write unit tests for all service methods

## Testing

- Write tests for all new features
- Maintain or improve test coverage
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies (database, API calls)

```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Ensure linting passes
5. Request review from maintainers
6. Address review feedback
7. Merge after approval

## Commit Messages

Use conventional commits:

```
feat: add new workout feature
fix: resolve login issue
docs: update API documentation
style: format code
refactor: simplify auth logic
test: add tests for nutrition service
chore: update dependencies
```

## Reporting Issues

- Use the GitHub issue tracker
- Include steps to reproduce
- Include expected vs actual behavior
- Include browser/OS information if relevant

## License

By contributing, you agree that your contributions will be licensed under the project license.
