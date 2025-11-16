# IriSync - Complete Setup Instructions

## For Absolute Beginners (Never Coded Before)

This guide will help you set up and run IriSync on your local computer, even if you've never coded before.

---

## Prerequisites

Before you start, you need to install these tools on your computer:

### 1. Install Node.js (Required)

**What is it?** Node.js lets you run JavaScript code on your computer.

**How to install:**
1. Go to https://nodejs.org/
2. Download the **LTS version** (Long Term Support) - the green button
3. Run the installer
4. Click "Next" through all the steps (use default settings)
5. Restart your computer after installation

**How to verify:**
1. Open Command Prompt (Windows) or Terminal (Mac)
2. Type: `node --version`
3. You should see something like `v20.11.0`

### 2. Install Git (Required)

**What is it?** Git helps you download and manage code.

**How to install:**
1. Go to https://git-scm.com/downloads
2. Download for your operating system (Windows/Mac)
3. Run the installer
4. Click "Next" through all steps (use default settings)

**How to verify:**
1. Open Command Prompt or Terminal
2. Type: `git --version`
3. You should see something like `git version 2.42.0`

### 3. Get a Code Editor (Recommended)

**We recommend Visual Studio Code (VS Code):**
1. Go to https://code.visualstudio.com/
2. Download and install
3. This makes it easier to view and edit files

---

## Step 1: Get the Code

### Option A: If You Already Have the Code
- If you downloaded the code as a ZIP file, extract it to a folder
- Note the folder location (e.g., `C:\Users\YourName\IriSync`)

### Option B: Download from GitHub
1. Open Command Prompt or Terminal
2. Navigate to where you want the code:
   ```bash
   cd Documents
   ```
3. Download the code:
   ```bash
   git clone https://github.com/YourUsername/IriSync.git
   cd IriSync
   ```

---

## Step 2: Set Up Environment Variables

Environment variables are like secret settings for your app. You need to create a file that stores these settings.

### Create the `.env.local` File

1. **Open the IriSync folder** in VS Code or File Explorer
2. **Find the file** `.env.local.example`
3. **Make a copy** of this file and rename it to `.env.local`
   - On Windows: Right-click → Copy → Paste → Rename to `.env.local`
   - On Mac: Duplicate the file and rename to `.env.local`

### Fill in Required Values

Open `.env.local` in a text editor and fill in these REQUIRED fields:

#### 1. NextAuth Secret (REQUIRED)
```
NEXTAUTH_SECRET=your-super-secret-key-here-at-least-32-characters-long
```
**How to generate:**
- Go to https://generate-secret.vercel.app/32
- Copy the generated secret
- Paste it after `NEXTAUTH_SECRET=`

#### 2. Firebase Configuration (REQUIRED for Auth)

You need a Firebase account (it's free):

1. **Go to** https://console.firebase.google.com/
2. **Sign in** with your Google account
3. **Click** "Create a project" or select existing project
4. **Get your config:**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"
   - Scroll down to "Your apps"
   - Click the `</>` (web) icon
   - Register your app (name it "IriSync Web")
   - **Copy the config values** shown

5. **Paste values** into `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abc123
```

**IMPORTANT:** The `MESSAGING_SENDER_ID` MUST have quotes around it!

#### 3. Firebase Admin (REQUIRED for Server)

Still in Firebase Console:

1. **Go to** Project Settings → Service Accounts
2. **Click** "Generate new private key"
3. **Download** the JSON file
4. **Open** the JSON file and copy these values:

```
FIREBASE_ADMIN_PROJECT_ID=(copy from "project_id" in JSON)
FIREBASE_ADMIN_CLIENT_EMAIL=(copy from "client_email" in JSON)
FIREBASE_ADMIN_PRIVATE_KEY=(copy the entire "private_key" field, keep \n characters)
```

### Optional Configuration

These are optional but recommended for full functionality:

- **Stripe** (for payments) - Get from https://dashboard.stripe.com/
- **OpenAI** (for AI features) - Get from https://platform.openai.com/
- **Google OAuth** (for "Sign in with Google") - Get from https://console.cloud.google.com/

**You can skip these for now** and add them later when needed.

---

## Step 3: Install Dependencies

Dependencies are the building blocks your app needs to run.

1. **Open Command Prompt/Terminal** in the IriSync folder
   - In VS Code: Click Terminal → New Terminal
   - Or: Navigate using `cd` command to the IriSync folder

2. **Run this command:**
   ```bash
   npm install
   ```

3. **Wait** for it to finish (may take 2-5 minutes)
   - You'll see lots of text scrolling
   - When it's done, you'll see your cursor back

**Troubleshooting:**
- If you get "npm not found": Node.js isn't installed properly - restart computer
- If you get permission errors: Run Command Prompt as Administrator (Windows)

---

## Step 4: Run the Development Server

Now let's start your app!

1. **In the terminal**, run:
   ```bash
   npm run dev
   ```

2. **Wait** for "Ready in X ms" or "Local: http://localhost:3000"

3. **Open your web browser** and go to:
   ```
   http://localhost:3000
   ```

4. **You should see** the IriSync homepage!

**Troubleshooting:**
- **Port already in use:** Another app is using port 3000
  - Solution: Stop other apps or use `npm run dev -- -p 3001`
- **Firebase not configured:** You didn't fill in the `.env.local` file
  - Solution: Go back to Step 2
- **Module not found:** Dependencies didn't install
  - Solution: Run `npm install` again

---

## Step 5: Test the App

1. **Click "Register"** to create an account
2. **Fill in** the form
3. **Check your email** for verification (if Firebase email is set up)
4. **Log in** with your account

If everything works, congratulations! Your app is running! 🎉

---

## Common Commands

### Start Development Server
```bash
npm run dev
```
Runs the app at http://localhost:3000

### Stop the Server
Press `Ctrl + C` in the terminal

### Install New Packages
```bash
npm install
```

### Build for Production
```bash
npm run build
```

### Run Production Build Locally
```bash
npm run build
npm start
```

---

## Project Structure (What's What)

```
IriSync/
├── src/                          # All your source code
│   ├── app/                      # Website pages
│   │   ├── (auth)/              # Login, register pages
│   │   ├── (marketing)/         # Homepage, pricing
│   │   └── (dashboard)/         # User dashboard
│   ├── components/              # Reusable UI parts
│   ├── lib/                     # Helper functions
│   └── styles/                  # Visual styling
├── public/                       # Images, fonts, static files
├── .env.local                   # YOUR SECRET SETTINGS (don't share!)
├── .env.local.example           # Template for settings
├── package.json                 # List of dependencies
└── README.md                    # This file
```

---

## Need Help?

### Firebase Errors
- **"Firebase not configured"**: Fill in `.env.local` with Firebase settings
- **"Invalid API key"**: Double-check you copied the Firebase config correctly
- **"Auth domain mismatch"**: Add `localhost` to Firebase authorized domains:
  - Firebase Console → Authentication → Settings → Authorized domains

### Build Errors
- **"Module not found"**: Run `npm install` again
- **"Port 3000 in use"**: Use `npm run dev -- -p 3001` for different port
- **"Out of memory"**: Close other apps and try again

### Still Stuck?
1. Check the [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) file for advanced setup
2. Search the error message on Google
3. Check Firebase Console for authentication logs
4. Review `.env.local.example` to ensure you didn't miss any required fields

---

## Next Steps

Once your app is running:

1. **Customize the app** - Edit files in `src/app/` to change pages
2. **Add features** - Check `src/components/` for reusable components
3. **Deploy to production** - See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)

---

## Security Reminder

**NEVER share or commit these files:**
- `.env.local` - Contains your secret keys
- `firebase-service-account.json` - If you downloaded it

**These are secret!** If you accidentally share them:
1. Go to Firebase Console
2. Regenerate all keys
3. Update `.env.local` with new keys

---

**Made with ❤️ for beginners**
