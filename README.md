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
Create a `.env.local` file from the template:
```bash
cp env.fixed.txt .env.local
```

   The `env.fixed.txt` template contains placeholder values. You must replace each placeholder value with your own credentials from your Firebase, NextAuth, and other platform integrations before running the application.

   To audit every runtime secret required by the codebase, you can generate a Vercel environment checklist:

```bash
npm run env:report
```

   This command writes a human-readable report to `docs/deployment/vercel-environment-checklist.md` that groups missing variables by integration and flags anything not already defined in `.env.local`.

   **Important:** The `.env.local` file should contain all the necessary environment variables. The following is an example of the required variables:

   ```env
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=
   FIREBASE_SERVICE_ACCOUNT_KEY=

   # Stripe
   STRIPE_SECRET_KEY= # Your Stripe secret key
   STRIPE_PUBLISHABLE_KEY= # Your Stripe publishable key
   STRIPE_WEBHOOK_SECRET=

   # Google Cloud
   GOOGLE_CLOUD_PROJECT_ID=
   GOOGLE_CLOUD_STORAGE_BUCKET=
   GOOGLE_CLOUD_CREDENTIALS=

   # Redis
   REDIS_HOST=
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # AI
   OPENAI_API_KEY=
   REPLICATE_API_TOKEN=
   GOOGLE_MODEL_NAME=gemini-pro

   # OAuth Clients
   FACEBOOK_CLIENT_ID=
   FACEBOOK_CLIENT_SECRET=
   TWITTER_API_KEY=
   LINKEDIN_CLIENT_ID=

   # App Settings
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## ▶️ Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run linter

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
