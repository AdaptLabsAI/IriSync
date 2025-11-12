# IriSync UI Conversion Plan

## Design System Overview

### Color Palette
- Primary Background: `#F5F5F7`
- Dark Background: `#0D0D0D` (for dashboards)
- Accent Green: `#00C853`
- Dark Green: `#003305`
- Text Primary: `#131A13`
- Text Secondary: `rgba(19, 26, 19, 0.55)`
- White: `#FFFFFF`

### Typography
- Font Family: Inter
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Sizes: 12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px, 64px, 80px

### Layout Patterns
- Border Radius: 12px, 16px, 24px, 32px
- Spacing: 8px, 12px, 16px, 24px, 32px, 40px, 80px
- Gradients: `linear-gradient(135deg, #00C853 0%, #003305 100%)`

## Complete Page Inventory & Conversion Plan

### 1. Marketing Pages (5 pages) - FULL UI CONVERSION REQUIRED
- [ ] `(marketing)/home/page.tsx` - Landing page with hero, features, pricing, testimonials
- [ ] `(marketing)/blog/page.tsx` - Blog listing page
- [ ] `(marketing)/features-pricing/page.tsx` - Features and pricing showcase
- [ ] `(marketing)/integrations/page.tsx` - Integration showcase
- [ ] `(marketing)/testimonial/page.tsx` - Testimonial showcase

### 2. Authentication Pages (8 pages) - FULL UI CONVERSION REQUIRED
- [ ] `(auth)/login/page.tsx` - Login form with new design
- [ ] `(auth)/register/page.tsx` - Registration form with new design
- [ ] `(auth)/logout/page.tsx` - Logout confirmation
- [ ] `(auth)/firebase-test/page.tsx` - Firebase testing page
- [ ] `(auth)/resend-verification/page.tsx` - Email verification resend
- [ ] `(auth)/reset-password/page.tsx` - Password reset form
- [ ] `(auth)/reset-password/confirm/page.tsx` - Password reset confirmation
- [ ] `(auth)/verify-email/page.tsx` - Email verification page

### 3. Dashboard Pages (15 pages) - FULL UI CONVERSION REQUIRED
- [ ] `(dashboard)/dashboard/page.tsx` - Main dashboard with analytics widgets
- [ ] `(dashboard)/dashboard/ai/page.tsx` - AI tools overview
- [ ] `(dashboard)/dashboard/ai/content/page.tsx` - AI content generation
- [ ] `(dashboard)/dashboard/analytics/page.tsx` - Analytics dashboard
- [ ] `(dashboard)/dashboard/content/page.tsx` - Content management hub
- [ ] `(dashboard)/dashboard/content/calendar/page.tsx` - Content calendar
- [ ] `(dashboard)/dashboard/content/create/page.tsx` - Content creation
- [ ] `(dashboard)/dashboard/content/editor/page.tsx` - Content editor
- [ ] `(dashboard)/dashboard/content/inbox/page.tsx` - Social inbox
- [ ] `(dashboard)/dashboard/content/media/page.tsx` - Media library
- [ ] `(dashboard)/dashboard/content/smart-create/page.tsx` - Smart content creation
- [ ] `(dashboard)/dashboard/content/smart-creator/page.tsx` - Smart creator tools
- [ ] `(dashboard)/dashboard/crm/page.tsx` - CRM dashboard
- [ ] `(dashboard)/dashboard/platforms/callback/page.tsx` - Platform callback handler
- [ ] `(dashboard)/dashboard/todo/page.tsx` - Todo management
- [ ] `(dashboard)/dashboard/storage/page.tsx` - Storage management
- [ ] `(dashboard)/dashboard/settings/page.tsx` - Settings hub
- [ ] `(dashboard)/dashboard/settings/billing/page.tsx` - Billing settings
- [ ] `(dashboard)/dashboard/settings/connections/page.tsx` - Connection settings
- [ ] `(dashboard)/dashboard/settings/profile/page.tsx` - Profile settings
- [ ] `(dashboard)/dashboard/settings/team/page.tsx` - Team management

### 4. Legal Pages (3 pages) - BASIC UI CONVERSION
- [ ] `(legal)/cookies/page.tsx` - Cookie policy
- [ ] `(legal)/privacy/page.tsx` - Privacy policy
- [ ] `(legal)/terms/page.tsx` - Terms of service

### 5. Support Pages (18 pages) - FULL UI CONVERSION REQUIRED
- [ ] `(support)/about/page.tsx` - About page
- [ ] `(support)/api-reference/page.tsx` - API documentation
- [ ] `(support)/documentation/page.tsx` - Documentation hub
- [ ] `(support)/documentation/[slug]/page.tsx` - Dynamic documentation pages
- [ ] `(support)/documentation/create/page.tsx` - Create documentation
- [ ] `(support)/documentation/category/[id]/page.tsx` - Documentation categories
- [ ] `(support)/documentation/category/api-guides/page.tsx` - API guides hub
- [ ] `(support)/documentation/category/api-guides/authentication/page.tsx` - Auth guide
- [ ] `(support)/documentation/category/api-guides/content-api/page.tsx` - Content API guide
- [ ] `(support)/documentation/category/api-guides/endpoints/page.tsx` - Endpoints guide
- [ ] `(support)/documentation/category/api-guides/integration/page.tsx` - Integration guide
- [ ] `(support)/documentation/category/api-guides/webhooks/page.tsx` - Webhooks guide
- [ ] `(support)/documentation/api-guides/authentication/page.tsx` - Authentication docs
- [ ] `(support)/roadmap/page.tsx` - Product roadmap
- [ ] `(support)/support/page.tsx` - Support hub
- [ ] `(support)/support/faq/page.tsx` - FAQ page
- [ ] `(support)/support/forum/page.tsx` - Forum hub
- [ ] `(support)/support/forum/[id]/page.tsx` - Forum thread
- [ ] `(support)/support/forum/category/[id]/page.tsx` - Forum category
- [ ] `(support)/support/forum/create/page.tsx` - Create forum post
- [ ] `(support)/support/tickets/page.tsx` - Support tickets
- [ ] `(support)/system-status/page.tsx` - System status

### 6. Careers Pages (5 pages) - FULL UI CONVERSION REQUIRED
- [ ] `(careers)/careers/page.tsx` - Careers hub
- [ ] `(careers)/careers/[slug]/page.tsx` - Job details
- [ ] `(careers)/careers/applications/[id]/page.tsx` - Application details
- [ ] `(careers)/careers/create/page.tsx` - Create job posting
- [ ] `(careers)/careers/edit/[id]/page.tsx` - Edit job posting

### 7. Admin Pages (28 pages) - FUNCTIONAL UI WITH BASIC STYLING
- [ ] `(admin)/admin/ai-models/page.tsx` - AI models management
- [ ] `(admin)/admin/analytics/page.tsx` - Admin analytics
- [ ] `(admin)/admin/audit-logs/page.tsx` - Audit logs
- [ ] `(admin)/admin/blog/page.tsx` - Blog management
- [ ] `(admin)/admin/careers/page.tsx` - Career management
- [ ] `(admin)/admin/dashboard/page.tsx` - Admin dashboard
- [ ] `(admin)/admin/database/page.tsx` - Database management
- [ ] `(admin)/admin/documentation/page.tsx` - Documentation management
- [ ] `(admin)/admin/documentation/create/page.tsx` - Create documentation
- [ ] `(admin)/admin/knowledge/page.tsx` - Knowledge base management
- [ ] `(admin)/admin/knowledge/[id]/page.tsx` - Knowledge base item
- [ ] `(admin)/admin/knowledge/new/page.tsx` - Create knowledge base item
- [ ] `(admin)/admin/knowledge-base/page.tsx` - Knowledge base hub
- [ ] `(admin)/admin/knowledge-base/categories/page.tsx` - KB categories
- [ ] `(admin)/admin/roadmap/page.tsx` - Roadmap management
- [ ] `(admin)/admin/roles/page.tsx` - Role management
- [ ] `(admin)/admin/settings/page.tsx` - Admin settings
- [ ] `(admin)/admin/settings/engagement-benchmarks/page.tsx` - Engagement benchmarks
- [ ] `(admin)/admin/settings/features/page.tsx` - Feature flags
- [ ] `(admin)/admin/support/stats/page.tsx` - Support statistics
- [ ] `(admin)/admin/support/tickets/page.tsx` - Support ticket management
- [ ] `(admin)/admin/system-status/page.tsx` - System status management
- [ ] `(admin)/admin/testimonials/page.tsx` - Testimonial management
- [ ] `(admin)/admin/testimonials/[id]/page.tsx` - Testimonial details
- [ ] `(admin)/admin/testimonials/new/page.tsx` - Create testimonial
- [ ] `(admin)/admin/tokens/settings/page.tsx` - Token settings
- [ ] `(admin)/admin/tokens/usage/page.tsx` - Token usage
- [ ] `(admin)/admin/users/page.tsx` - User management
- [ ] `(admin)/admin/users/bulk-ops/page.tsx` - Bulk user operations

### 8. Miscellaneous Pages (5 pages)
- [ ] `page.tsx` - Root page (redirect)
- [ ] `platforms/callback/page.tsx` - Platform callback

## Implementation Strategy

### Phase 1: Core Components & Design System (Week 1)
1. Create new UI component library matching Website UI patterns
2. Build layout components (Header, Sidebar, Footer)
3. Create common form components
4. Set up global styles and theme

### Phase 2: Marketing & Auth Pages (Week 2)
1. Convert all marketing pages to new UI
2. Convert all authentication pages
3. Ensure responsive design across all screen sizes

### Phase 3: Dashboard Pages (Week 3-4)
1. Convert main dashboard with new sidebar design
2. Convert all content management pages
3. Convert analytics and AI tool pages
4. Convert settings pages

### Phase 4: Support & Documentation (Week 5)
1. Convert all support pages
2. Convert documentation system
3. Convert forum pages

### Phase 5: Admin & Specialized Pages (Week 6)
1. Convert admin pages with functional focus
2. Convert careers pages
3. Convert legal pages
4. Final testing and cleanup

## Technical Requirements

### New Dependencies
- Remove Material-UI dependency
- Use Tailwind CSS for styling
- Implement custom components matching Website UI patterns

### Component Patterns
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow the exact color scheme and typography from Website UI
- Maintain all existing functionality
- Ensure proper error handling and loading states

### Testing Requirements
- Test all pages for responsive design
- Verify all links and navigation work correctly
- Test all forms and interactive elements
- Ensure proper authentication flows

## Quality Assurance

### Pre-Conversion Checklist
- [ ] Backup current implementation
- [ ] Document all existing functionality
- [ ] Create component inventory
- [ ] Set up testing environment

### Post-Conversion Verification
- [ ] All pages load correctly
- [ ] All navigation links work
- [ ] All forms submit properly
- [ ] All interactive elements function
- [ ] Responsive design works on all screen sizes
- [ ] Performance meets standards
- [ ] No broken API integrations
- [ ] Authentication flows work properly

## Notes
- Admin pages prioritize functionality over aesthetics but must follow basic styling patterns
- All other pages require full UI conversion to match Website UI exactly
- Maintain all existing API integrations and data flows
- Ensure proper error handling and loading states throughout
- Test thoroughly on desktop, tablet, and mobile devices 
