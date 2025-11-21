// Type augmentation for next/headers in Next.js 15
// In Next.js 15, cookies() returns ReadonlyRequestCookies synchronously, not a Promise

declare module 'next/headers' {
  import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

  export function cookies(): ReadonlyRequestCookies;

  // Re-export other exports from next/headers
  export * from 'next/dist/server/request/headers';
  export * from 'next/dist/server/request/draft-mode';
}
