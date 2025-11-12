# Irisync Project Structure Documentation

## Overview

This document explains the project structure of the Irisync platform, focusing on the organization of code within the `src` directory. Understanding this structure is essential for developers working on the platform.

## Directory Structure

### Top-Level Directories

- **src/app**: Contains all Next.js App Router-based pages, layouts, and API routes
- **src/components**: Reusable UI components used across different pages
- **src/context**: React Context providers for global state management
- **src/hooks**: Custom React hooks for reusable logic and state management
- **src/lib**: Core business logic, services, and utilities
- **src/providers**: Higher-order components and context providers
- **src/templates**: Template files for content generation and components
- **src/types**: TypeScript type definitions and interfaces
- **src/utils**: Utility functions and helpers

## Routes vs. Route Groups

### What Are Routes?

Routes are standard folders within the Next.js App Router architecture that directly map to URL paths. For example, a folder at `src/app/admin/users` will create a route accessible at `/admin/users`.

### What Are Route Groups?

Route groups are folders wrapped in parentheses, such as `src/app/(admin)/dashboard`. These do not affect the URL structure but serve organizational purposes and allow for shared layouts. In this example, the URL would be `/dashboard`, not `/(admin)/dashboard`.

### When to Use Route Groups

Use route groups when:
- You need to share layouts across multiple routes
- You want logical organization without affecting URL structure
- You need to implement parallel routing with multiple pages at the same URL

### When to Use Standard Routes

Use standard routes when:
- The URL hierarchy should directly reflect your folder structure
- You need simpler, more predictable routing
- Each section has its own distinct layout requirements

## Current Implementation

In the Irisync platform, we use a combination of routes and route groups:

### Route Groups

- **src/app/(admin)**: Admin-related pages that share the admin layout but have different URL structures
- **src/app/(auth)**: Authentication-related pages (login, register, etc.) with a shared layout
- **src/app/(dashboard)**: User dashboard pages with a shared dashboard layout
- **src/app/(marketing)**: Public-facing pages with a marketing layout

### Standard Routes

- **src/app/admin**: Admin pages with routes like `/admin`, `/admin/users`, etc.
- **src/app/api**: API endpoints organized by domain
- **src/app/blog**: Blog content and functionality
- **src/app/careers**: Career/jobs listings and application functionality
- **src/app/platforms**: Integration with external platforms, including OAuth callbacks
- **src/app/support**: Support and help center pages
- **src/app/todo**: Task management functionality

## API Structure

The `src/app/api` directory contains all API endpoints, organized by domain:

- **src/app/api/admin**: Admin-only API endpoints for managing users, content, and system settings
- **src/app/api/auth**: Authentication-related endpoints
- **src/app/api/content**: Content management endpoints
- **src/app/api/platforms**: Endpoints for external platform integration

Each API route follows the App Router convention with a `route.ts` file that exports HTTP method handlers.

## Best Practices

1. **Consistent Approach**: Choose either route groups or standard routes for similar functionality to maintain consistency
2. **Descriptive Naming**: Use clear, descriptive names for directories and files
3. **Component Organization**: Keep related components together in the components directory
4. **Shared Logic**: Extract shared business logic into the lib directory
5. **Type Safety**: Define TypeScript interfaces in the types directory and use them consistently

## Specific Directory Purposes

### src/lib

The `lib` directory contains the core business logic of the application:

- **src/lib/ai**: AI functionality including models, prompts, and providers
- **src/lib/analytics**: Analytics tracking and reporting
- **src/lib/auth**: Authentication and authorization logic
- **src/lib/cache**: Caching mechanisms including Redis implementation
- **src/lib/content**: Content management logic
- **src/lib/database**: Database interaction utilities
- **src/lib/firebase**: Firebase configuration and utilities
- **src/lib/platforms**: Platform integration logic

### src/components

The `components` directory contains reusable UI components:

- **src/components/admin**: Admin-specific UI components
- **src/components/ai**: AI-related components like generators and analysis tools
- **src/components/auth**: Authentication-related components
- **src/components/common**: Shared utility components
- **src/components/content**: Content creation and management components
- **src/components/dashboard**: Dashboard widgets and components
- **src/components/ui**: Base UI components (buttons, inputs, etc.)

## Critical Features and Their Locations

- **Authentication**: Implemented in `src/lib/auth` and surfaced in `src/app/(auth)`
- **Admin Dashboard**: Implemented in `src/app/admin` with components in `src/components/admin`
- **Content Management**: API in `src/app/api/content` with UI in `src/app/(dashboard)/content`
- **Social Media Integration**: API in `src/app/api/platforms` with OAuth in `src/app/platforms`
- **AI Features**: Core logic in `src/lib/ai` with UI in `src/components/ai`
- **User Management**: Admin controls in `src/app/admin/users` with API in `src/app/api/admin/users`

## Required Implementations

The following areas require implementation:

- **Blog System**: Full implementation in `src/app/blog` with admin controls in `src/app/admin/blog`
- **Careers System**: Job posting and application system in `src/app/careers` with admin in `src/app/admin/careers`

Both systems should include:
- Creation, editing, and deletion functionality (admin-only)
- Public viewing for all users
- Comments on blog posts (for authenticated users)
- Job application submission
- Admin inbox for applications
- Filtering and management tools 