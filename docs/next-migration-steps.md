# Next Steps for App Router Migration

## Priorities Based on Migration Plan

### Phase 2: Core Features Migration

#### Week 3-4: Dashboard Pages (COMPLETED)
- [x] Complete dashboard pages
  - [x] User dashboard analytics section
  - [x] Performance metrics widget
  - [x] Activity feed component
  - [x] Notifications panel
- [x] Implement proper loading states for all dashboard components
- [x] Add error boundaries for dashboard sections
- [x] Ensure all metadata is correctly configured

#### Week 4: Authentication Integration (Current Focus)
- [x] Install NextAuth.js and configure providers
  - [x] Google provider
  - [x] Email/password provider
- [x] Create auth options and callbacks in auth.ts
- [x] Implement session provider in providers.tsx
- [x] Update middleware to use NextAuth session validation
- [x] Update login/register forms to use NextAuth.js signIn/signUp

### Week 5-6: Dashboard Core & Settings (Upcoming)
- [x] Migrate User Profile settings page
- [x] Migrate Team settings page
- [x] Implement Connection Settings
- [x] Implement Billing Settings
- [x] Create settings API route handlers

## Completed Tasks
- [x] App Router directory structure created
- [x] Root layout with proper providers 
- [x] Authentication layouts
- [x] Login, register, reset password pages
- [x] Auth API routes
- [x] Dashboard layout
- [x] Dashboard overview page
- [x] Content Calendar page
- [x] Content Creation page
- [x] Dashboard analytics section with performance metrics
- [x] Dashboard activity feed component
- [x] Dashboard notifications panel

## Implementation Best Practices

### Server vs Client Components
- Use **Server Components** for:
  - Data fetching
  - Initial page rendering
  - SEO metadata
  - Static UI elements
- Use **Client Components** for:
  - Interactive elements
  - Form handling (unless using server actions)
  - Real-time updates
  - Components requiring browser APIs

### Data Fetching Pattern
```tsx
// Example pattern for server component data fetching
async function getData() {
  try {
    const res = await fetch('https://api.example.com/data', { next: { revalidate: 60 } });
    
    if (!res.ok) {
      throw new Error('Failed to fetch data');
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Let error boundary handle it
  }
}

export default async function Page() {
  const data = await getData();
  
  return (
    <ClientComponent data={data} />
  );
}
```

### Loading UI Pattern
```tsx
// loading.tsx
export default function Loading() {
  return (
    <div>
      <SkeletonUI />
    </div>
  );
}
```

### Error Handling Pattern
```tsx
// error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Migration Testing Checklist
For each migrated page, ensure:
- [ ] Data fetching works correctly
- [ ] Loading states display properly
- [ ] Error boundaries catch and display errors
- [ ] SEO metadata is properly implemented
- [ ] Forms submit correctly
- [ ] Authentication/authorization works
- [ ] Responsive layout is preserved
- [ ] Accessibility is maintained

## Resources
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Suspense and Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) 