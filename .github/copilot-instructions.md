# IriSync - GitHub Copilot Instructions

## Project Overview

IriSync is an AI-powered social media management platform built with Next.js (App Router) that helps businesses streamline their social media presence through automated content creation, scheduling, and analytics.

**Key Features:**
- AI-powered content creation and performance analysis
- Smart content scheduling and publishing
- Comprehensive analytics and engagement reporting
- Enterprise-grade security with role-based access control
- Team collaboration with approval workflows
- Subscription and billing management

## Tech Stack

**Frontend:**
- Next.js 14 (App Router architecture)
- React 18
- TypeScript (strict mode enabled)
- Material-UI (MUI) v7 for UI components
- Tailwind CSS for utility styling
- Framer Motion for animations

**Backend:**
- Node.js
- Next.js API Routes (App Router `/app/api/` structure)
- Firebase Firestore for database
- Firebase Authentication with NextAuth.js
- Redis for caching

**AI & Integrations:**
- OpenAI API for content generation
- Google Gemini Pro for AI capabilities
- Replicate for additional AI models
- Stripe for payment processing
- Multiple OAuth providers (LinkedIn, Twitter, Facebook, Google)

**Development Tools:**
- Jest for testing
- ESLint for code linting
- TypeScript for type safety
- Prisma for database ORM

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Reusable React components
├── lib/              # Utility functions and shared logic
├── hooks/            # Custom React hooks
├── context/          # React Context providers
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── styles/           # Global styles
└── middleware.ts     # Next.js middleware

docs/                 # Project documentation
prisma/              # Prisma schema and migrations
public/              # Static assets
scripts/             # Build and deployment scripts
.github/             # GitHub Actions workflows
```

## Building and Testing

### Development Commands
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run Jest tests
npm run lint         # Run ESLint and security checks
npm run check-secrets # Scan for hard-coded secrets
```

### Before Making Changes
1. Always run `npm install` after pulling latest changes
2. Run `npm run lint` to check for existing issues
3. Run `npm run test` to ensure tests pass
4. Review relevant documentation in `docs/` folder

## Coding Standards

### TypeScript
- **Strict mode is enabled** - all code must be fully typed
- Use explicit return types for functions
- Avoid `any` type - use `unknown` with type guards when needed
- Use TypeScript interfaces over types for object definitions
- Place type definitions in `src/types/` for shared types

### React & Next.js
- Use **Next.js App Router** exclusively (no Pages Router)
- Components should be functional with hooks (no class components)
- Use React Server Components by default
- Mark interactive components with `'use client'` directive when needed
- Follow Next.js file conventions:
  - `page.tsx` for routes
  - `layout.tsx` for layouts
  - `loading.tsx` for loading states
  - `error.tsx` for error boundaries
  - API routes in `app/api/[endpoint]/route.ts`

### Component Standards
- Use Material-UI (MUI) components as the primary UI library
- Apply Tailwind CSS for utility styling and custom designs
- Keep components small and focused (Single Responsibility Principle)
- Extract reusable logic into custom hooks in `src/hooks/`
- Use proper component naming: PascalCase for components, camelCase for functions

### Code Organization
- Group related functionality together
- Use barrel exports (`index.ts`) for cleaner imports
- Keep file names descriptive and consistent with their exports
- Place API integration logic in `src/lib/`
- Store constants and configuration in appropriate files

### Styling
- Prefer MUI's `sx` prop for component-specific styles
- Use Tailwind utility classes for layout and spacing
- Keep custom styles minimal and purposeful
- Ensure responsive design (mobile-first approach)
- Follow Material Design principles for UI consistency

## Security Guidelines

### Critical Security Rules
1. **Never commit secrets or API keys** to the repository
2. Always use environment variables for sensitive data
3. Store environment variables in `.env.local` (never `.env`)
4. Run `npm run check-secrets` before committing
5. Validate and sanitize all user inputs
6. Use proper authentication checks in API routes
7. Implement rate limiting for public endpoints
8. Follow OWASP security best practices

### Authentication & Authorization
- Use NextAuth.js for authentication
- Check user sessions in protected routes
- Implement role-based access control (RBAC)
- Verify permissions before data operations
- Use Firebase Admin SDK for server-side operations

### Environment Variables
- Client-side variables must start with `NEXT_PUBLIC_`
- Server-side secrets should never be exposed to client
- Document all required environment variables
- Use `.env.example` as a template for new variables

## Testing Standards

### Test Structure
- Place tests in `src/__tests__/` directory
- Name test files with `.test.ts` or `.test.tsx` suffix
- Write unit tests for utilities and hooks
- Write integration tests for API routes
- Mock external dependencies (Firebase, APIs, etc.)

### Test Quality
- Aim for meaningful test coverage (not just high percentage)
- Test edge cases and error scenarios
- Use descriptive test names that explain the behavior
- Keep tests independent and isolated
- Clean up resources after tests (mocks, timers, etc.)

## Git & Version Control

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commits format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for formatting changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

### Pull Requests
- Keep PRs focused and reasonably sized
- Write clear PR descriptions explaining the changes
- Link related issues using keywords (Closes #123)
- Ensure all tests pass before requesting review
- Address review feedback promptly

## Common Patterns

### API Routes (App Router)
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Server Components with Data Fetching
```typescript
// app/dashboard/page.tsx
async function DashboardPage() {
  const data = await fetchData();
  return <div>{/* Render data */}</div>;
}
```

### Client Components
```typescript
'use client';

import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState();
  // Implementation
}
```

### Custom Hooks
```typescript
// src/hooks/useCustomHook.ts
import { useState, useEffect } from 'react';

export function useCustomHook() {
  const [data, setData] = useState();
  // Implementation
  return { data };
}
```

## Firebase Integration

- Use Firebase Admin SDK on server-side only
- Use Firebase Client SDK in client components
- Initialize Firebase properly in lib files
- Handle Firestore queries with proper error handling
- Use Firebase Security Rules to protect data
- Follow Firestore data modeling best practices

## AI Integration Guidelines

- Cache AI responses when appropriate
- Implement proper error handling for API failures
- Use environment variables for API keys
- Add rate limiting to prevent abuse
- Log AI usage for monitoring and debugging
- Handle API timeouts gracefully

## Performance Considerations

- Use Next.js Image component for optimized images
- Implement proper loading states
- Use React.memo() for expensive computations
- Leverage Next.js caching strategies
- Optimize bundle size (analyze with `next build`)
- Use dynamic imports for code splitting

## Documentation

- Update documentation when adding new features
- Keep README.md current with accurate setup instructions
- Document complex logic with code comments
- Add JSDoc comments for public APIs
- Maintain API documentation in `docs/` folder
- Document environment variables in `.env.example`

## What to Avoid

1. **Don't** modify the Next.js App Router structure to Pages Router
2. **Don't** use deprecated MUI components or patterns
3. **Don't** bypass TypeScript type checking with `any`
4. **Don't** commit console.log statements to production code
5. **Don't** remove or modify existing tests without good reason
6. **Don't** add new dependencies without discussion
7. **Don't** hard-code values that should be configurable
8. **Don't** skip linting and testing before committing

## Support and Resources

- Check `docs/` folder for detailed documentation
- Review existing code patterns before implementing new features
- Ask questions in pull requests or issues
- Refer to Next.js, React, and MUI official documentation
- Contact team at contact@irisync.com for urgent matters

## Task Suitability for Copilot

**Good Tasks for Copilot:**
- Bug fixes in isolated components
- Adding tests for existing functionality
- Refactoring code for better readability
- Implementing UI components from specifications
- Documentation improvements
- Code style and linting fixes
- Adding TypeScript types to untyped code

**Tasks Requiring Human Review:**
- Architecture changes
- Security-sensitive modifications
- Database schema changes
- Payment integration changes
- Authentication flow modifications
- Third-party API integration changes
- Major refactoring across multiple files
