# Validation and Testing Guide

## Quick Validation Checklist

Use this checklist to verify the changes work correctly in different environments.

## 1. Local Development Validation

### Prerequisites
Ensure you have Node 20 installed:
```bash
node --version  # Should be v20.x.x
```

If not, install Node 20:
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or the .nvmrc file will auto-switch
nvm use
```

### Steps

1. **Clean Install**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
   
   ✅ Should complete without errors
   ✅ Should see "added 1311 packages"
   ✅ Should NOT see engine mismatch errors

2. **Check Dependencies**
   ```bash
   npm ls --depth=0
   ```
   
   ✅ Should NOT show any "UNMET DEPENDENCY" warnings
   ✅ All packages should be installed

3. **Run Linter**
   ```bash
   npm run lint
   ```
   
   ✅ Should complete (may show linting errors, but should run)
   ✅ Should NOT show "command not found" errors

4. **Run Tests**
   ```bash
   npm test
   ```
   
   ✅ Should run Jest tests
   ✅ Verify no import errors for new dependencies

5. **Start Dev Server**
   ```bash
   npm run dev
   ```
   
   ✅ Should start on http://localhost:3000
   ✅ Check console for any import/module errors
   ✅ Test key features:
      - Authentication
      - Content creation
      - Media upload
      - Social connections

6. **Build Locally**
   ```bash
   npm run build
   ```
   
   ✅ Should complete without errors
   ✅ Should NOT show deprecated config warnings
   ✅ Should create `.next` directory
   ✅ Note the build time for comparison

## 2. CI Workflow Validation

### GitHub Actions

1. **Check Workflow Files**
   ```bash
   # Verify all workflows use Node 20
   grep -n "node-version" .github/workflows/*.yml
   ```
   
   ✅ All should show `node-version: '20'` or `node-version: 20`

2. **Monitor CI Runs**
   - Push your changes to trigger CI
   - Watch the GitHub Actions tab
   
   ✅ All jobs should pass:
      - Code Quality ✅
      - Security Audit ✅
      - Run Tests ✅
      - Build Application ✅
      - Bundle Size Check ✅

3. **Check CI Logs**
   Look for:
   - ✅ "Setup Node.js" shows version 20.x.x
   - ✅ "added 1311 packages" in install
   - ✅ No deprecated warning in build
   - ✅ Build completes successfully

## 3. Vercel Deployment Validation

### Pre-deployment Checks

1. **Verify Vercel Configuration**
   ```bash
   cat vercel.json
   ```
   
   ✅ Should use `npm ci --prefer-offline`
   ✅ Build command should be simplified

2. **Check Environment Variables**
   - Go to Vercel dashboard
   - Project Settings → Environment Variables
   - ✅ All required variables are set

### Deployment Test

1. **Deploy to Preview**
   - Push to a feature branch or PR
   - Vercel will auto-deploy preview
   
   ✅ Build should complete in < 35 minutes
   ✅ Check build logs for:
      - Node version (should be 20.x)
      - Install time
      - Build time
      - No deprecated warnings

2. **Test Preview Deployment**
   - Visit preview URL
   - Test all major features:
     - ✅ Login/Authentication
     - ✅ Dashboard loads
     - ✅ Content creation
     - ✅ Media handling
     - ✅ Social platform connections
     - ✅ Analytics

3. **Monitor Performance**
   - Check Vercel Analytics
   - ✅ No increase in errors
   - ✅ Similar or better page load times
   - ✅ No new runtime errors

## 4. Dependency Verification

### Check Added Dependencies Work

Test features that use newly added dependencies:

1. **@google-cloud/storage** - Media uploads
   ```bash
   # Test file upload functionality
   # Upload an image in content creation
   ```
   ✅ Media uploads work correctly

2. **form-data** - Mastodon integration
   ```bash
   # Test Mastodon posting
   ```
   ✅ Mastodon posts work

3. **formidable** - File uploads
   ```bash
   # Test file uploads via API
   ```
   ✅ File upload API works

4. **jsonwebtoken** - Authentication
   ```bash
   # Test login/logout
   ```
   ✅ Auth tokens work correctly

5. **node-fetch** - External API calls
   ```bash
   # Test social media connections
   ```
   ✅ API calls work correctly

### Verify Removed Dependencies Don't Break Anything

Since we removed unused packages, verify nothing broke:

1. **Check Import Statements**
   ```bash
   # Search for removed packages
   grep -r "@headlessui/react" src/
   grep -r "framer-motion" src/
   grep -r "next-connect" src/
   ```
   
   ✅ Should return no results (except comments)

2. **Run Full Test Suite**
   ```bash
   npm test -- --coverage
   ```
   
   ✅ All tests should pass
   ✅ No import errors

## 5. Performance Benchmarks

### Measure Build Times

Record these metrics before and after:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| npm install | ~59s | ~60s | Comparable |
| Local build | ? | ? | TBD |
| CI build | ? | ? | TBD |
| Vercel build | ~45min | ? | TBD |

### How to Measure

1. **npm install**
   ```bash
   rm -rf node_modules package-lock.json
   time npm install
   ```

2. **Local build**
   ```bash
   rm -rf .next
   time npm run build
   ```

3. **CI build**
   - Check GitHub Actions duration

4. **Vercel build**
   - Check Vercel dashboard build logs

## 6. Known Issues and Workarounds

### Issue: Peer Dependency Warnings

If you see peer dependency warnings:
```bash
npm WARN ERESOLVE overriding peer dependency
```

**Solution**: 
- These are expected due to `legacy-peer-deps=true` in .npmrc
- They don't affect functionality
- Can be ignored unless they cause actual errors

### Issue: Engine Mismatch Error

If you see:
```bash
npm ERR! engine Unsupported engine
```

**Solution**:
```bash
# Update Node.js to version 20
nvm install 20
nvm use 20

# Or bypass temporarily (not recommended)
npm install --ignore-engines
```

### Issue: Build Cache Issues

If build behaves unexpectedly:

**Solution**:
```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

## 7. Rollback Plan

If issues occur in production:

1. **Quick Rollback**
   - Revert the PR in GitHub
   - Trigger new deployment

2. **Selective Rollback**
   - Keep Node 20 (beneficial)
   - Rollback dependency changes if needed
   - Revert configuration changes if needed

3. **Environment Workaround**
   - Temporarily set Node version in Vercel to 18
   - Keep new dependencies
   - Fix configuration issues

## 8. Success Criteria

All of these should be true:

✅ CI/CD passes all checks
✅ Local development works smoothly
✅ All tests pass
✅ Build completes without errors
✅ No deprecated configuration warnings
✅ Vercel deployment succeeds
✅ All features work in production
✅ No new runtime errors
✅ Performance is same or better
✅ Node version is 20.x everywhere

## 9. Post-Deployment Monitoring

After deploying to production:

1. **First 24 Hours**
   - Monitor error rates in Vercel/Sentry
   - Check build times for subsequent deployments
   - Watch for any user-reported issues

2. **First Week**
   - Review Vercel Analytics
   - Check build cache performance
   - Monitor package install times

3. **Ongoing**
   - Keep Node.js updated within v20 LTS
   - Monitor for new deprecation warnings
   - Track build time trends

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check Vercel deployment logs
3. Review OPTIMIZATION_CHANGES.md
4. Review SUMMARY_REPORT.md
5. Open an issue with:
   - Error messages
   - Environment (local/CI/Vercel)
   - Steps to reproduce
