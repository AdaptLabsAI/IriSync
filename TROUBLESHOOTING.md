# Firebase Login Troubleshooting Guide

## 🚨 IMMEDIATE STEPS TO FIX LOGIN ISSUES

### Step 1: Run Diagnostics Page

Visit this page on your production website:
```
https://www.irisync.com/firebase-test
```

**This will show you:**
- ✅ Which environment variables are set
- ❌ Which environment variables are missing
- 🔍 Detailed Firebase configuration status
- 📋 Error messages if any

**Take screenshots of:**
1. The entire diagnostics page
2. Browser console (F12) logs

---

### Step 2: Check Vercel Environment Variables

1. **Log into Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your IriSync project

2. **Navigate to Environment Variables**
   - Settings → Environment Variables
   - Or: https://vercel.com/[your-team]/[irisync-project]/settings/environment-variables

3. **Verify ALL these variables exist:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   ```

4. **Check for common issues:**
   - ❌ Variables without `NEXT_PUBLIC_` prefix (won't work!)
   - ❌ Empty or placeholder values
   - ❌ Spaces or quotes in values (should be clean)
   - ⚠️ `MESSAGING_SENDER_ID` must be in quotes: `"554117967400"`

---

### Step 3: Get Firebase Configuration Values

If variables are missing, get them from Firebase:

1. **Go to Firebase Console**
   - https://console.firebase.google.com
   - Select your project

2. **Get Project Settings**
   - Click gear icon ⚙️ → Project Settings
   - Scroll to "Your apps" section
   - Find your web app or create one

3. **Copy Configuration Values**
   - Click on your web app
   - Look for "Firebase SDK snippet"
   - Choose "Config" option
   - You'll see:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",                    // → NEXT_PUBLIC_FIREBASE_API_KEY
     authDomain: "xxx.firebaseapp.com",    // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     projectId: "xxx",                     // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
     storageBucket: "xxx.appspot.com",     // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     messagingSenderId: "123456789",       // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     appId: "1:123:web:abc"                // → NEXT_PUBLIC_FIREBASE_APP_ID
   };
   ```

---

### Step 4: Add Variables to Vercel

For EACH missing variable:

1. Click "Add New" in Vercel Environment Variables
2. **Name**: Exact name from list above (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. **Value**: The value from Firebase Console (NO quotes for most, YES quotes for MESSAGING_SENDER_ID)
4. **Environment**: Select all (Production, Preview, Development)
5. Click "Save"

**Example:**
```
Name:  NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Environments: ☑ Production ☑ Preview ☑ Development
```

---

### Step 5: Redeploy

After adding ALL variables:

1. Go to Vercel Deployments tab
2. Click "Redeploy" on latest deployment
   - OR: Push any change to trigger new deployment
3. Wait for deployment to complete (usually 2-3 minutes)

---

### Step 6: Test Login

After redeployment:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Visit login page**: https://www.irisync.com/login
3. **Try logging in**
4. **Check console** (F12) for any errors

---

## 🔍 Common Error Messages & Solutions

### Error: "Firebase authentication is not configured"
**Cause**: Environment variables not set in Vercel
**Solution**: Follow Steps 2-5 above

### Error: "auth/invalid-api-key"
**Cause**: Wrong API key or missing `NEXT_PUBLIC_FIREBASE_API_KEY`
**Solution**: Verify API key in Firebase Console matches Vercel

### Error: "auth/operation-not-allowed"
**Cause**: Email/password authentication not enabled in Firebase
**Solution**:
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Save

### Error: "Expected first argument to collection()"
**Cause**: Firestore not initialized (already fixed in code)
**Solution**: Ensure Firebase env vars are set

### Console shows: "Firebase config status: ✗ Invalid"
**Cause**: Missing environment variables
**Solution**: Add missing variables shown in diagnostic page

---

## 📋 Diagnostic Checklist

Use this checklist to verify everything:

### Vercel Configuration
- [ ] All 6 `NEXT_PUBLIC_FIREBASE_*` variables exist
- [ ] Variables are set for Production environment
- [ ] No typos in variable names
- [ ] Values match Firebase Console
- [ ] `MESSAGING_SENDER_ID` is in quotes if it's numeric

### Firebase Console
- [ ] Email/Password authentication is enabled
- [ ] Authorized domains include `irisync.com` and `www.irisync.com`
- [ ] Web app is registered in project
- [ ] Project billing is active (if using certain features)

### Code Deployment
- [ ] Latest code is deployed to Vercel
- [ ] No build errors in deployment logs
- [ ] All new files are committed to git

### Testing
- [ ] Diagnostic page shows all variables as "SET"
- [ ] Console shows: "Firebase client initialized successfully"
- [ ] Login page loads without errors
- [ ] Login form submits without errors

---

## 🆘 If Still Not Working

### Provide These Details:

1. **Screenshot of diagnostic page**: https://www.irisync.com/firebase-test
2. **Screenshot of F12 console** showing errors
3. **Screenshot of Vercel environment variables** (blur sensitive values)
4. **Exact error message** when trying to log in
5. **Test email** you're trying to use (if it's a test account)

### Quick Tests:

**Test 1**: Check if Firebase is initialized
```javascript
// In browser console (F12), run:
console.log(typeof window !== 'undefined');  // Should be: true
console.log(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);  // Should show your API key
```

**Test 2**: Check network requests
1. Open F12 → Network tab
2. Try to log in
3. Look for requests to `identitytoolkit.googleapis.com`
4. Check response status and error message

**Test 3**: Try different browser
- Sometimes cached data causes issues
- Try incognito/private mode
- Try different browser

---

## 📞 Emergency Contacts

If nothing works after following all steps:

1. **Firebase Support**: https://firebase.google.com/support
2. **Vercel Support**: https://vercel.com/support
3. **Check Firebase Status**: https://status.firebase.google.com

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **Diagnostic page** shows:
   ```
   All environment variables: ✓ SET
   Firebase Status: configured: true
   ```

2. **Browser console** shows:
   ```
   ✓ Firebase client initialized successfully
   ```

3. **Login page** allows you to:
   - Enter email/password
   - Click submit
   - Redirect to dashboard (if credentials valid)

4. **No red errors** in console

---

## 🔄 After Fix Checklist

Once login is working:

- [ ] Test regular login at `/login`
- [ ] Test admin login at `/admin-access` (or `/admin`)
- [ ] Test forgot password flow
- [ ] Test registration
- [ ] Verify dashboard access after login
- [ ] Check if logged-in state persists after refresh

---

## 📝 Notes

- Environment variables in Vercel are **build-time** values
  - Changing them requires redeployment
  - Values are baked into the build

- `NEXT_PUBLIC_` prefix is **required** for client-side access
  - Without it, values won't be available in browser
  - Double-check spelling and case

- Firebase initialization happens once per page load
  - If it fails, page needs to be refreshed after fixing env vars
  - Clear cache to ensure new values are used
