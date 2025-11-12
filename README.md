# IriSync - AI-Powered Social Media Management Platform

IriSync is a cutting-edge marketing technology platform that leverages artificial intelligence to streamline social media management for businesses. Our platform provides automated content creation, scheduling, and analytics solutions to help businesses optimize their social media presence. The platform is production-ready with full feature integration, secure role-based access, and streamlined team workflows.

## 🚀 Features

- 🤖 AI-Powered Content Creation & Performance Analysis
- 📅 Smart Content Scheduling & Publishing Tools
- 📊 Comprehensive Analytics & Engagement Reporting
- 🔒 Enterprise-Grade Security & Role-Based Access (NextAuth)
- 🎯 Campaign Performance Tracking
- 👥 Team Collaboration with Approval Workflows
- 💰 Subscription & Billing Management (Stripe)
- 🖼️ Media Library

## 🧩 Tech Stack

- **Frontend**: Next.js (App Router), React, Material-UI, Tailwind CSS
- **Backend**: Node.js, Firebase Firestore, Google Cloud, Redis
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth, NextAuth.js, OAuth (LinkedIn, Twitter, Facebook, Google)
- **AI Integrations**: OpenAI, Gemini Pro, Replicate
- **Payments**: Stripe
- **Storage**: Firebase Storage
- **Deployment**: Vercel / Custom Hosting

## 🛠️ Getting Started

### 📦 Prerequisites

- Node.js v18+
- Firebase project with Firestore
- Stripe account (for billing)
- Google Cloud credentials
- Redis / Memorystore setup
- OAuth credentials for each supported social platform

### ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/AdaptLabsAI/IriSync
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file from the template and populate it with your own credentials:

```bash
cp .env.example .env.local
```

   The template enumerates all required variables, including sensitive values like `GEN_LANG_API_KEY`, `STRIPE_SECRET_KEY`, and client-safe keys prefixed with `NEXT_PUBLIC_`. Update the placeholders with project-specific secrets before running the application.

   To audit every runtime secret required by the codebase, you can generate a Vercel environment checklist:

```bash
npm run env:report
```

   This command writes a human-readable report to `docs/deployment/vercel-environment-checklist.md` that groups missing variables by integration and flags anything not already defined in `.env.local`.

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🌍 Environment & Deployment

1. **Local development**
   - Copy `.env.example` to `.env.local` and fill in the required values (`GEN_LANG_API_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `STRIPE_SECRET_KEY`, `NEXTAUTH_SECRET`, etc.).
   - Keep `.env.local` out of version control—`.gitignore` already prevents accidental commits.
   - Run `npm run check-secrets` before committing to ensure no hard-coded credentials exist in tracked files.

2. **Vercel deployment**
   - In the Vercel dashboard, open **Project → Settings → Environment Variables**.
   - Add the server-only values (`GEN_LANG_API_KEY`, `STRIPE_SECRET_KEY`, `NEXTAUTH_SECRET`, `FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`).
   - Add client-exposed variables with the `NEXT_PUBLIC_` prefix (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`).
   - Provide OAuth credentials like `GOOGLE_OAUTH_CLIENT_ID` and any provider-specific client secrets used in the integrations directory.

3. **Secret rotation**
   - Rotate any keys that were previously committed to the repository before redeploying.
   - Revoke and regenerate Firebase, Google Cloud, and OAuth credentials if they were ever exposed.

4. **Pre-deploy checklist**
   - Confirm `npm run check-secrets` and `npm run lint` pass locally.
   - Trigger a Preview deployment in Vercel to verify runtime environment variables are wired correctly.

## ▶️ Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run linter
- `npm run check-secrets` - Scan the tracked files for hard-coded secrets

## Project Structure

The project follows a standard Next.js App Router structure with additional directories for organization:

```
.
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable components
│   ├── lib/              # Utility functions and shared logic
│   └── styles/           # Global styles and theme
├── docs/                 # Project documentation
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets (images, fonts, etc.)
├── scripts/              # Utility and automation scripts
└── .github/              # GitHub Actions workflows
```

## 📘 Documentation

See the [`docs/`](./docs) folder for detailed documentation on:

* API reference (App Router)
* Launch checklist
* Migration plan
* Post-launch support
* Redis setup
* Environment setup

## ✅ Production Checklist

- [x] Fully migrated to Next.js App Router
- [x] All legacy `pages/` and `pages/api/` files removed
- [x] Live authentication, dashboard, content, and admin flows
- [x] Test suite updated and passing
- [x] Monitoring and alerting configured (e.g., Sentry)

## 🧪 QA & Test Baseline

- Post-migration test suite serves as the new baseline.
- Add unit/integration tests for new or refactored features.
- Maintain App Router conventions across all modules.

## 🚀 Deployment & Monitoring

- Add `.env` variables in your cloud environment.
- Enable Google Cloud Memorystore (Redis).
- Set up alerting and error monitoring (e.g., Sentry).
- Final steps and post-launch support in `docs/development/final-steps.md`.

## 🛡️ Security Notes

Do **not** commit `.env` or credential files to version control.
Always validate OAuth, API keys, and database rules prior to deployment.

## 📫 Contact

For any inquiries, please reach out to our team at contact@irisync.com.

---

**© IriSync Inc.** — All rights reserved.
