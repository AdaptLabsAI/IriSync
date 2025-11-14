# Optimization Changes - November 2025

## Summary
This document outlines the changes made to optimize Node.js version, reduce dependencies, and improve build performance.

## Changes Made

### 1. Node.js Version Upgrade
**Issue**: Inconsistent Node.js versions across environments
- CI workflow (ci.yml) was using Node 18
- build-guard.yml was already using Node 20
- No engine specification in package.json

**Solution**:
- ✅ Updated all GitHub Actions workflows to use Node.js 20
- ✅ Added `engines` field to package.json requiring Node >=20.0.0 and npm >=10.0.0
- ✅ Created `.nvmrc` file with Node 20 for local development consistency
- ✅ Enabled `engine-strict=true` in .npmrc to enforce version requirements

**Benefits**:
- Consistent Node.js environment across all deployments
- Access to latest Node.js LTS features and performance improvements
- Better security with latest LTS version

### 2. Dependency Cleanup

#### Removed Unused Production Dependencies (7 packages):
1. `@headlessui/react` - Not used in codebase
2. `@radix-ui/react-label` - Not used in codebase
3. `dropbox` - Only referenced in UI mockups, no actual implementation
4. `framer-motion` - Not imported or used anywhere
5. `next-connect` - Not used (using Next.js 16 App Router)
6. `pintura` (v0.3.10) - Duplicate of @pqina/pintura which is actually used
7. `readline` - Not used in any Node scripts

#### Removed Unused Dev Dependencies (15 packages):
1. `assert` - Unused polyfill
2. `autoprefixer` - Not needed with Tailwind CSS v4
3. `browserify-zlib` - Unused polyfill
4. `buffer` - Unused polyfill
5. `crypto-browserify` - Unused polyfill
6. `https-browserify` - Unused polyfill
7. `os-browserify` - Unused polyfill
8. `path-browserify` - Unused polyfill
9. `postcss` - Moved to @tailwindcss/postcss
10. `punycode` - Unused polyfill
11. `querystring-es3` - Unused polyfill
12. `stream-http` - Unused polyfill
13. `string_decoder` - Unused polyfill
14. `ts-node` - Not used in any scripts
15. `url` - Unused polyfill

#### Added Missing Dependencies (7 packages):
1. `@google-cloud/storage` - Used in src/lib/media/MediaService.ts
2. `form-data` - Used in src/lib/features/platforms/providers/MastodonProvider.ts
3. `formdata-node` - Used in src/lib/features/platforms/adapters/ThreadsAdapter.ts
4. `formidable` - Used in src/app/api/ai/media/auto-tag/route.ts
5. `jsonwebtoken` - Used in src/lib/auth/auth-service.ts
6. `node-fetch` - Used in src/lib/auth/social-auth.ts
7. Plus corresponding @types packages

**Net Result**: 
- Removed: 22 unused packages
- Added: 7 missing packages
- Package count change: 1301 → 1311 (added necessary dependencies outweigh removed ones)

### 3. Build Configuration Optimizations

#### next.config.js
- ✅ Removed deprecated `eslint` configuration (no longer supported in Next.js 16)
- ✅ Removed invalid `experimental.turbo` configuration
- ✅ Kept `typescript.ignoreBuildErrors: true` for faster builds (type checking done in CI)
- ✅ Maintained Turbopack configuration for faster bundling

#### vercel.json
- ✅ Simplified build commands (removed `--no-audit` flag, already in .npmrc)
- ✅ Using `npm ci --prefer-offline` for faster, reproducible installs

#### .npmrc
- ✅ Enabled `engine-strict=true` to enforce Node 20 requirement
- ✅ Added performance tuning:
  - `maxsockets=50` - Parallel downloads for faster install
  - `fetch-retries=2` - Reduced retry attempts
  - `fetch-retry-mintimeout=10000` - 10s minimum timeout
  - `fetch-retry-maxtimeout=60000` - 60s maximum timeout

#### .gitignore
- ✅ Added `generated/` to prevent committing Prisma generated files

## Performance Impact

### Expected Improvements:
1. **Node.js 20 Benefits**:
   - ~10-15% faster runtime performance
   - Better memory management
   - Improved security

2. **Reduced Dependencies**:
   - ~2-3% faster npm install (fewer packages to download)
   - Smaller node_modules footprint
   - Reduced attack surface

3. **Build Configuration**:
   - Eliminated deprecated config warnings
   - Better caching with npm ci
   - Parallel downloads with maxsockets=50

### Actual Results:
- **Package Install**: From 59s to ~60s (similar, but with correct dependencies)
- **Build Time**: Still requires full test (was interrupted)

## Recommendations for Further Optimization

If build times remain problematic, consider:

1. **Code Splitting**: Review large components for dynamic imports
2. **Bundle Analysis**: Use `@next/bundle-analyzer` to identify large dependencies
3. **Caching Strategy**: Ensure Vercel build cache is working properly
4. **Micro-frontend Architecture**: For large apps, consider splitting into smaller apps
5. **Static Generation**: Use ISR/SSG where possible instead of SSR
6. **Image Optimization**: Ensure all images are optimized before committing

## Testing Checklist

Before merging:
- [ ] Verify CI workflows pass with Node 20
- [ ] Test local development with Node 20
- [ ] Run full build on Vercel to measure actual improvement
- [ ] Verify all features work with new dependencies
- [ ] Check for any peer dependency warnings
- [ ] Monitor first production build for performance

## References

- [Node.js 20 LTS Release](https://nodejs.org/en/blog/release/v20.0.0)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)
- [Vercel Build Optimization](https://vercel.com/docs/concepts/deployments/build-optimization)
- [npm ci Documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)
